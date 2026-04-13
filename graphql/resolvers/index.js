const userResolver = require('./user.resolver');
const warehouseResolver = require('./warehouse.resolver');
const storeResolver = require('./store.resolver');
const shelfResolver = require('./shelf.resolver');
const merchantResolver = require('./merchant.resolver');
const catalogResolver = require('./catalog.resolver');
const inventoryResolver = require('./inventory.resolver');
const purchaseResolvers = require('./purchase.resolver.js');
const invoiceResolvers = require('./invoice.resolver.js');

const resolvers = [
  userResolver,
  warehouseResolver,
  storeResolver,
  shelfResolver,
  merchantResolver,
  catalogResolver,
  inventoryResolver,
  purchaseResolvers,
  invoiceResolvers
];

module.exports = resolvers;
