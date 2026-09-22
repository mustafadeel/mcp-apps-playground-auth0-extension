import assert from 'node:assert/strict';
import test from 'node:test';

const formsResourceMeta = await import('../src/toolkits/auth0-forms/resource-meta.ts');

const EXPECTED_CSP = {
  resourceDomains: ['https:', 'data:'],
  connectDomains: ['https:'],
  frameDomains: ['https://js.stripe.com', 'https://*.stripe.com'],
};

test('Auth0 Forms resource metadata supports restrictive MCP hosts', () => {
  assert.deepEqual(formsResourceMeta.FORMS_RESOURCE_UI_META, {
    domain: 'localhost',
    csp: EXPECTED_CSP,
  });

  for (const sources of Object.values(formsResourceMeta.FORMS_RESOURCE_CSP)) {
    assert.equal(sources.includes('*'), false);
    assert.equal(sources.includes('blob:'), false);
  }
});
