import { configureAxe } from 'vitest-axe';

// Configure axe for accessibility testing
configureAxe({
  rules: {
    // Disable color-contrast rule for tests as it can be flaky
    'color-contrast': { enabled: false },
    // Disable landmark rules for component tests
    'region': { enabled: false },
    // Enable all other important accessibility rules
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
});

// Global accessibility test helpers
export const a11yConfig = {
  // Common rules to disable for certain component types
  disableColorContrast: {
    rules: { 'color-contrast': { enabled: false } }
  },
  
  // Rules for form components
  formRules: {
    rules: {
      'label': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'select-name': { enabled: true },
    }
  },
  
  // Rules for navigation components
  navigationRules: {
    rules: {
      'link-name': { enabled: true },
      'button-name': { enabled: true },
      'skip-link': { enabled: true },
    }
  },
  
  // Rules for interactive components
  interactiveRules: {
    rules: {
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'aria-allowed-attr': { enabled: true },
      'aria-required-attr': { enabled: true },
      'tabindex': { enabled: true },
    }
  },
};