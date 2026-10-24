// All user-facing copy lives here so Armenian localization can be added later.
export const T = {
  brand: 'EcoLoop',
  tagline: 'Turn organic waste into valuable resources.',
  sub: 'Recycle smarter. Earn rewards. Power a circular future.',
  demoBanner: 'Demo build. Bins, weights, partners and recovery figures are simulated.',
  currency: 'AMD',
  city: 'Yerevan, Armenia'
};
export const fmt = (n, d = 0) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: d });
export const date = (s) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
