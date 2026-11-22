const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

test('CURRENT BEHAVIOUR: order pricing uses HSN slab and taxes the discounted taxable amount', function () {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }];
  const orderTotals = pricing.computeTotals(items, 'WELCOME');

  assert.deepEqual(orderTotals, {
    subtotal: 100,
    discount: 5,
    taxable: 95,
    tax: 4.75,
    cgst: 2.38,
    sgst: 2.37,
    total: 99.75,
    lines: [{
      id: 1,
      name: 'Rice',
      hsn: '1006',
      gstPercent: 5,
      gross: 100,
      discount: 5,
      taxable: 95,
      tax: 4.75,
      net: 99.75
    }]
  });
});

test('invoice matches the GST slab and billed amounts used by order pricing', function () {
  const order = {
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: 'WELCOME',
    subtotal: 100,
    discount: 5,
    tax: 4.75,
    total: 99.75
  };
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(figures, {
    subtotal: 100,
    discount: 5,
    tax: 4.75,
    cgst: 2.38,
    sgst: 2.37,
    total: 99.75,
    rows: [{
      id: 1, name: 'Rice', sku: '-', hsn: '1006', qty: 1, price: 100,
      gstPercent: 5, line: 95, lineTax: 4.75
    }]
  });
});

test('invoice applies product HSN tax rates and retains explicit decimal gstRate values as percentages', function () {
  const hsnFigures = invoice.computeInvoiceFigures({
    items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }]
  });
  const explicitRateFigures = invoice.computeInvoiceFigures({
    items: [{ name: 'Oil', gstRate: 0.05, price: 100, qty: 1 }]
  });

  assert.equal(hsnFigures.rows[0].gstPercent, 5);
  assert.equal(hsnFigures.tax, 5);
  assert.equal(explicitRateFigures.rows[0].gstPercent, 5);
  assert.equal(explicitRateFigures.tax, 5);
  assert.equal(explicitRateFigures.total, 105);
});

test('invoice coupon discount and GST match order pricing', function () {
  const order = {
    items: [{ name: 'Item', price: 100, qty: 1 }],
    coupon: 'WELCOME'
  };

  const orderTotal = pricing.computeTotals(order.items, order.coupon);
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(orderTotal.discount, 5);
  assert.equal(orderTotal.tax, 17.1);
  assert.equal(orderTotal.total, 112.1);
  assert.equal(invoiceFigures.discount, 5);
  assert.equal(invoiceFigures.tax, 17.1);
  assert.equal(invoiceFigures.total, 112.1);
});

test('invoice reconciliation matches stored billing amounts', function () {
  const order = {
    id: 42,
    date: '2026-11-22',
    customer: 'Sample Customer',
    coupon: 'WELCOME',
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    subtotal: 100,
    discount: 5,
    tax: 4.75,
    total: 99.75
  };
  const result = reports.getGstReconciliation({ orders: [order], products: [], customers: [] });

  assert.equal(result.mismatchCount, 0);
  assert.equal(result.rows[0].invoiceDiscount, order.discount);
  assert.equal(result.rows[0].invoiceTax, order.tax);
  assert.equal(result.rows[0].invoiceTotal, order.total);
  assert.equal(result.rows[0].matched, true);
});

test('invoice HTML shows the billed GST and does not report a false total mismatch', function () {
  const html = invoice.render({
    id: 7,
    date: '2026-11-22',
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: 'WELCOME',
    subtotal: 100,
    discount: 5,
    tax: 4.75,
    total: 99.75
  });

  assert.match(html, /GST %<\/th><th class="r">GST Amt/);
  assert.match(html, /<td class="r">5%<\/td>/);
  assert.match(html, /Coupon Discount \(WELCOME\)<\/td><td class="r" style="color:#16a34a">-₹5\.00/);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">₹4\.75/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹99\.75/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
