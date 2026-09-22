# Challenge: Stripe (and similar payment SDKs) inside MCP App sandbox

## Symptom

Stripe.js fails to initialize when embedded inside an Auth0 Form rendered via an MCP App:

```
Stripe.js requires 'allow-same-origin' if sandboxed.
Access to fetch at 'https://r.stripe.com/b' from origin 'null' has been blocked by CORS policy
```

## Root cause

The MCP client renders MCP Apps in sandboxed iframes. When `allow-same-origin` is absent from the sandbox attribute, any nested iframe (including Stripe's sub-iframes) gets `origin: null`. Stripe's servers (`r.stripe.com`, `m.stripe.com`) don't accept `null` as an allowed CORS origin, so their requests fail.

This is not a CSP domain issue — adding entries to `frameDomains` or `connectDomains` does not help because the CORS rejection happens server-side at Stripe.

## Implemented metadata contract

The Auth0 Forms resource now declares the following metadata in
`src/toolkits/auth0-forms/index.ts`:

- `domain: 'localhost'` requests a dedicated sandbox origin from compatible
  hosts. MCP Inspector's `app-origin-controller` detects a non-empty domain and
  serves the app from a dedicated listener (port 6278) with
  `allow-same-origin`, giving the document a real origin instead of `null`.
- `resourceDomains: ['https:', 'data:']` permits the dynamically injected
  tenant Forms SDK and its HTTPS static dependencies.
- `connectDomains: ['https:']` permits SDK HTTPS requests.
- `frameDomains: ['https://js.stripe.com', 'https://*.stripe.com']` permits
  Stripe Elements and related payment frames.

The targeted CSP lists are necessary for restrictive hosts, but CSP alone does
not alter iframe origin semantics. A host must honor the `domain` request and
provide `allow-same-origin` for Stripe's CORS checks to pass.

See [inspector#1862](https://github.com/modelcontextprotocol/inspector/issues/1862) and [inspector#2370](https://github.com/modelcontextprotocol/inspector/pull/2370).

## What would fix it (without Inspector-specific workaround)

The standard fix (per https://stackoverflow.com/q/70154598) is to add `allow-same-origin` to the `sandbox` attribute of the outer iframe. In our case the MCP host controls that attribute.

The ext-apps spec has a `sandbox.permissions` capability covering camera, mic, geolocation, and clipboard-write — but no `allow-same-origin` entry. There is currently no mechanism for an app to request it.

**This is a spec gap that needs to be raised with the ext-apps team.** The ask: add `allow-same-origin` as a declarable permission in `McpUiResourcePermissions` so apps can signal they need it (and hosts can grant/deny).

The `domain` field on `McpUiResourceMeta` (dedicated origin for the sandbox) is a related but separate mechanism — even with a real origin, `allow-same-origin` must still be present in the sandbox attribute for nested third-party iframes to inherit a non-null origin.

## Impact

Any third-party payment or identity SDK that spawns cross-origin iframes and uses postMessage or CORS-validated fetches will hit the same constraint (e.g., Stripe Elements, Braintree, Adyen Web). Auth0 Forms that include Stripe payment steps are blocked in the current MCP App sandbox model.

## Workaround options

- Remove the Stripe-backed form step from the Auth0 Form and handle payment separately outside the MCP App
- Ask the MCP client team to expose `allow-same-origin` as a declarable sandbox permission in the ext-apps spec
