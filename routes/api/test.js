const printer_escpos = require("escpos");
const { printer } = require("node-thermal-printer");
printer_escpos.USB = require("escpos-usb");
printer_escpos.Network = require("escpos-network");

console.log(printer_escpos.USB.findPrinter());