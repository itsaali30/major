const userSchema = require('./user.schema');
const warehouseSchema = require('./warehouse.schema');
const storeSchema = require('./store.schema');
const shelfSchema = require('./shelf.schema');
const merchantSchema = require('./merchant.schema');
const catalogSchema = require('./catalog.schema');
const inventorySchema = require('./inventory.schema');
const purchaseSchema = require('./purchase.schema.js');
const invoiceSchema = require('./invoice.schema.js');

const typeDefs = [
  userSchema,
  storeSchema,
  warehouseSchema,
  shelfSchema,
  catalogSchema,
  merchantSchema,
  inventorySchema,
  purchaseSchema,
  invoiceSchema
];

module.exports = typeDefs;
