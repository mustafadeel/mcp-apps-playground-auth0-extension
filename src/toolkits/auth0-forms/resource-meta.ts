export const FORMS_RESOURCE_DOMAIN = 'localhost';

export const FORMS_RESOURCE_CSP = {
  resourceDomains: ['https:', 'data:'],
  connectDomains: ['https:'],
  frameDomains: ['https://js.stripe.com', 'https://*.stripe.com'],
};

export const FORMS_RESOURCE_UI_META = {
  domain: FORMS_RESOURCE_DOMAIN,
  csp: FORMS_RESOURCE_CSP,
};
