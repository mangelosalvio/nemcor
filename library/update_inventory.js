const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Inventory = require("./../models/Inventory");
const BranchInventory = require("./../models/BranchInventory");
const numeral = require("numeral");
const round = require("./../utils/round");
const constants = require("./../config/constants");
const asyncForeach = require("./../utils/asyncForeach");
const DeletedOrder = require("./../models/DeletedOrder");

module.exports.updateInventoryFromStocksReceiving = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.raw_materials];
    if (items && items.length > 0) {
      items.forEach(item => {
        Inventory.findOneAndUpdate(
          {
            "product._id": item.raw_material._id
          },
          {
            $inc: {
              balance: item.raw_material_quantity
            },
            $set: {
              product: item.raw_material
            }
          },
          {
            new: true,
            upsert: true
          }
        ).exec();
      });
      resolve({ success: 1 });
    } else {
      resolve({ success: 1 });
    }
  });
};

module.exports.deductInventoryFromStocksReceiving = record => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.raw_materials];
    if (items && items.length > 0) {
      await asyncForeach(items, async item => {
        await Inventory.findOneAndUpdate(
          {
            "product._id": item.raw_material._id
          },
          {
            $inc: {
              balance: 0 - item.raw_material_quantity
            },
            $set: {
              product: item.raw_material
            }
          },
          {
            new: true,
            upsert: true
          }
        ).exec();
      });

      resolve({ success: 1 });
    } else {
      resolve({ success: 1 });
    }
  });
};

module.exports.deductInventoryFromSales = record => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    if (items && items.length > 0) {
      await asyncForeach(items, async item => {
        await Inventory.findOneAndUpdate(
          {
            "product._id": item.product._id
          },
          {
            $inc: {
              balance: 0 - item.quantity
            },
            $set: {
              product: item.product
            }
          },
          {
            new: true,
            upsert: true
          }
        ).exec();
      });

      resolve({ success: 1 });
    } else {
      resolve({ success: 1 });
    }
  });
};

module.exports.incrementInventoryFromVoidedSales = record => {
  return new Promise(async (resolve, reject) => {
    const items = [...record.items];
    if (items && items.length > 0) {
      await asyncForeach(items, async item => {
        await Inventory.findOneAndUpdate(
          {
            "product._id": item.product._id
          },
          {
            $inc: {
              balance: item.quantity
            },
            $set: {
              product: item.product
            }
          },
          {
            new: true,
            upsert: true
          }
        ).exec();
      });

      resolve({ success: 1 });
    } else {
      resolve({ success: 1 });
    }
  });
};

/**
 * BEG BALANCE
 */

module.exports.updateInventoryFromBegBalance = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.raw_materials];
    const date = moment.tz(moment(record.date), process.env.TIMEZONE);

    items.forEach(item => {
      BranchInventory.findOneAndUpdate(
        {
          date: {
            $gte: date
              .clone()
              .startOf("day")
              .toDate(),
            $lte: date
              .clone()
              .endOf("day")
              .toDate()
          },
          "product._id": item.raw_material._id
        },
        {
          $inc: {
            beg_bal: item.raw_material_quantity
          },
          $set: {
            date,
            product: item.raw_material
          }
        },
        {
          new: true,
          upsert: true
        }
      ).then(branch_inventory => {
        const { computed_bal, variance } = this.computeBalance({
          ...branch_inventory.toObject()
        });

        branch_inventory.computed_bal = computed_bal;
        branch_inventory.variance = variance;

        branch_inventory
          .save()
          .then(record => {
            resolve(record);
          })
          .catch(err => reject(err));
      });
    });
  });
};

module.exports.deductInventoryFromBegBalance = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.raw_materials];
    if (items && items.length > 0) {
      items.forEach(item => {
        BranchInventory.findOneAndUpdate(
          {
            date: {
              $gte: moment(record.date)
                .startOf("day")
                .toDate(),
              $lte: moment(record.date)
                .endOf("day")
                .toDate()
            },
            "product._id": item.raw_material._id
          },
          {
            $inc: {
              beg_bal: 0 - item.raw_material_quantity
            }
          },
          {
            new: true,
            upsert: true
          }
        ).then(branch_inventory => {
          const { computed_bal, variance } = this.computeBalance({
            ...branch_inventory.toObject()
          });

          branch_inventory.computed_bal = computed_bal;
          branch_inventory.variance = variance;

          branch_inventory
            .save()
            .then(branch_inventory => {
              /**
               * transfer ending to beginning balance of the next day
               */

              resolve(branch_inventory);
            })
            .catch(err => reject(err));
        });
      });
    } else {
      resolve({ success: 1 });
    }
  });
};

/**
 * ENDING BALANCE
 */

module.exports.updateInventoryFromEndingBalance = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.raw_materials];
    const date = moment.tz(moment(record.date), process.env.TIMEZONE);

    items.forEach(item => {
      Inventory.findOneAndUpdate(
        {
          "product._id": item.raw_material._id
        },
        {
          $inc: {
            balance: item.raw_material_quantity
          },
          $set: {
            product: item.raw_material
          }
        },
        {
          new: true,
          upsert: true
        }
      )
        .then(inventory => {
          resolve(inventory);
        })
        .catch(err => reject(err));
    });
  });
};

module.exports.deductInventoryFromEndingBalance = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.raw_materials];
    if (items && items.length > 0) {
      items.forEach(item => {
        BranchInventory.findOneAndUpdate(
          {
            date: {
              $gte: moment(record.date)
                .startOf("day")
                .toDate(),
              $lte: moment(record.date)
                .endOf("day")
                .toDate()
            },
            "product._id": item.raw_material._id
          },
          {
            $inc: {
              end_bal: 0 - item.raw_material_quantity
            }
          },
          {
            new: true,
            upsert: true
          }
        ).then(branch_inventory => {
          const { computed_bal, variance } = this.computeBalance({
            ...branch_inventory.toObject()
          });

          branch_inventory.computed_bal = computed_bal;
          branch_inventory.variance = variance;

          branch_inventory
            .save()
            .then(branch_inventory => {
              /**
               * transfer ending to beginning balance of the next day
               */

              resolve(branch_inventory);
            })
            .catch(err => reject(err));
        });
      });
    } else {
      resolve({ success: 1 });
    }
  });
};

/**
 * ORDERS
 */

module.exports.incrementInventoryFromOrders = record => {
  return new Promise((resolve, reject) => {
    const items = [...record.items];
    if (items && items.length > 0) {
      items.forEach(item => {
        item.product.raw_materials.forEach(rm => {
          const rm_quantity_utilized = round(
            item.quantity * rm.raw_material_quantity
          );
          BranchInventory.findOneAndUpdate(
            {
              date: {
                $gte: moment(record.datetime)
                  .startOf("day")
                  .toDate(),
                $lte: moment(record.datetime)
                  .endOf("day")
                  .toDate()
              },
              "product._id": rm.raw_material._id
            },
            {
              $inc: {
                orders: rm_quantity_utilized
              },
              $set: {
                date: record.datetime,
                product: rm.raw_material
              }
            },
            {
              new: true,
              upsert: true
            }
          ).then(branch_inventory => {
            const { computed_bal, variance } = this.computeBalance({
              ...branch_inventory.toObject()
            });

            branch_inventory.computed_bal = computed_bal;
            branch_inventory.variance = variance;

            branch_inventory
              .save()
              .then(record => {
                resolve(record);
              })
              .catch(err => reject(err));
          });
        });
      });
    }
  });
};

module.exports.decrementInventoryFromCancelingOrders = record => {
  return new Promise((resolve, reject) => {
    const datetime = moment.tz(moment(), process.env.TIMEZONE);
    const orders = [...record.orders];
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const items = [...order.items];
        if (items && items.length > 0) {
          items.forEach(order_item => {
            const raw_materials = [...order_item.product.raw_materials];

            if (raw_materials && raw_materials.length > 0) {
              raw_materials.forEach(raw_material_item => {
                const rm_quantity_utilized = round(
                  order_item.quantity * raw_material_item.raw_material_quantity
                );
                BranchInventory.findOneAndUpdate(
                  {
                    date: {
                      $gte: datetime
                        .clone()
                        .startOf("day")
                        .toDate(),
                      $lte: datetime
                        .clone()
                        .endOf("day")
                        .toDate()
                    },
                    "product._id": raw_material_item.raw_material._id
                  },
                  {
                    $inc: {
                      orders: 0 - rm_quantity_utilized
                    }
                  },
                  {
                    new: true,
                    upsert: true
                  }
                ).then(branch_inventory => {
                  const { computed_bal, variance } = this.computeBalance({
                    ...branch_inventory.toObject()
                  });

                  branch_inventory.computed_bal = computed_bal;
                  branch_inventory.variance = variance;

                  branch_inventory
                    .save()
                    .then(branch_inventory => {
                      resolve(branch_inventory);
                    })
                    .catch(err => reject(err));
                });
              });
            } else {
              return resolve({ success: 1 });
            }
          });
        } else {
          return resolve({ success: 1 });
        }
      });
    } else {
      return resolve({ success: 1 });
    }
  });
};

/**
 * UPDATING ORDER QUANTITY FROM BILLING FORM
 */

module.exports.incrementInventoryFromUpdatingOrder = (record, operation) => {
  return new Promise((resolve, reject) => {
    const datetime = moment.tz(moment(), process.env.TIMEZONE);
    const item = { ...record };
    item.product.raw_materials.forEach(rm => {
      const rm_quantity_utilized = round(
        item.quantity * rm.raw_material_quantity
      );

      const quantity =
        operation === constants.INCREMENT
          ? rm_quantity_utilized
          : 0 - rm_quantity_utilized;

      BranchInventory.findOneAndUpdate(
        {
          date: {
            $gte: datetime
              .clone()
              .startOf("day")
              .toDate(),
            $lte: datetime
              .clone()
              .endOf("day")
              .toDate()
          },
          "product._id": rm.raw_material._id
        },
        {
          $inc: {
            orders: quantity
          },
          $set: {
            date: datetime,
            product: rm.raw_material
          }
        },
        {
          new: true,
          upsert: true
        }
      ).then(branch_inventory => {
        const { computed_bal, variance } = this.computeBalance({
          ...branch_inventory.toObject()
        });

        branch_inventory.computed_bal = computed_bal;
        branch_inventory.variance = variance;

        branch_inventory
          .save()
          .then(record => {
            resolve(record);
          })
          .catch(err => reject(err));
      });
    });
  });
};

/**
 * INCREMENT SALES ON SALE
 * DECREMENT IN ORDERS AND INCREMENT IN SALES
 */

module.exports.incrementInventoryFromSales = record => {
  return new Promise((resolve, reject) => {
    const datetime = moment.tz(moment(), process.env.TIMEZONE);
    const orders = [...record.orders];
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const items = [...order.items];
        if (items && items.length > 0) {
          items.forEach(order_item => {
            const raw_materials = [...order_item.product.raw_materials];

            if (raw_materials && raw_materials.length > 0) {
              raw_materials.forEach(raw_material_item => {
                const rm_quantity_utilized = round(
                  order_item.quantity * raw_material_item.raw_material_quantity
                );
                BranchInventory.findOneAndUpdate(
                  {
                    date: {
                      $gte: datetime
                        .clone()
                        .startOf("day")
                        .toDate(),
                      $lte: datetime
                        .clone()
                        .endOf("day")
                        .toDate()
                    },
                    "product._id": raw_material_item.raw_material._id
                  },
                  {
                    $inc: {
                      orders: 0 - rm_quantity_utilized,
                      sales: rm_quantity_utilized
                    }
                  },
                  {
                    new: true,
                    upsert: true
                  }
                ).then(branch_inventory => {
                  const { computed_bal, variance } = this.computeBalance({
                    ...branch_inventory.toObject()
                  });

                  branch_inventory.computed_bal = computed_bal;
                  branch_inventory.variance = variance;

                  branch_inventory
                    .save()
                    .then(branch_inventory => {
                      resolve(branch_inventory);
                    })
                    .catch(err => reject(err));
                });
              });
            } else {
              return resolve({ success: 1 });
            }
          });
        } else {
          return resolve({ success: 1 });
        }
      });
    } else {
      return resolve({ success: 1 });
    }
  });
};

/**
 * UPDATE SALES IN INVENTORY ON UPDATE OF PRODUCT,
 * SHOULD THE PRODUCT HAVE RAW MATERIALS
 */

module.exports.incrementInventoryFromSales = record => {
  return new Promise((resolve, reject) => {
    const datetime = moment.tz(moment(), process.env.TIMEZONE);
    const orders = [...record.orders];
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const items = [...order.items];
        if (items && items.length > 0) {
          items.forEach(order_item => {
            const raw_materials = [...order_item.product.raw_materials];

            if (raw_materials && raw_materials.length > 0) {
              raw_materials.forEach(raw_material_item => {
                const rm_quantity_utilized = round(
                  order_item.quantity * raw_material_item.raw_material_quantity
                );
                BranchInventory.findOneAndUpdate(
                  {
                    date: {
                      $gte: datetime
                        .clone()
                        .startOf("day")
                        .toDate(),
                      $lte: datetime
                        .clone()
                        .endOf("day")
                        .toDate()
                    },
                    "product._id": raw_material_item.raw_material._id
                  },
                  {
                    $inc: {
                      orders: 0 - rm_quantity_utilized,
                      sales: rm_quantity_utilized
                    }
                  },
                  {
                    new: true,
                    upsert: true
                  }
                ).then(branch_inventory => {
                  const { computed_bal, variance } = this.computeBalance({
                    ...branch_inventory.toObject()
                  });

                  branch_inventory.computed_bal = computed_bal;
                  branch_inventory.variance = variance;

                  branch_inventory
                    .save()
                    .then(branch_inventory => {
                      resolve(branch_inventory);
                    })
                    .catch(err => reject(err));
                });
              });
            } else {
              return resolve({ success: 1 });
            }
          });
        } else {
          return resolve({ success: 1 });
        }
      });
    } else {
      return resolve({ success: 1 });
    }
  });
};

module.exports.forwardEndBalToBegBal = inventory => {
  const datetime = moment(inventory.date);
  BranchInventory.findOne({
    date: {
      $gte: datetime
        .clone()
        .add({ day: 1 })
        .startOf("day")
        .toDate(),
      $lte: datetime
        .clone()
        .add({ day: 1 })
        .endOf("day")
        .toDate()
    },
    "product._id": inventory.product._id
  }).then(branch_inventory => {
    if (branch_inventory) {
      /**
       * BRANCH INVENTORY FOUND
       */
      branch_inventory.beg_bal = inventory.end_bal;
      branch_inventory.save().then(this.rComputedBalances);
    } else {
      /**
       * NO BRANCH INVENTORY FOUND
       */
      const newBranchInventory = new BranchInventory({
        date: datetime
          .clone()
          .add({ day: 1 })
          .set({
            hour: 8,
            minute: 0
          }),
        product: inventory.product,
        beg_bal: inventory.end_bal
      });
      newBranchInventory.save().then(this.updateComputedBalances);
    }
  });
};

module.exports.updateComputedBalances = branch_inventory => {
  const { computed_bal, variance } = this.computeBalance({
    ...branch_inventory
  });

  branch_inventory.computed_bal = computed_bal;
  branch_inventory.variance = variance;

  branch_inventory.save();
};

module.exports.computeBalance = ({
  beg_bal = 0,
  product_ins = 0,
  orders = 0,
  sales = 0,
  end_bal = 0
}) => {
  beg_bal = beg_bal ? beg_bal : 0;
  product_ins = product_ins ? product_ins : 0;
  orders = orders ? orders : 0;
  sales = sales ? sales : 0;

  const total = numeral(0);
  total.add(beg_bal);
  total.add(product_ins);
  total.subtract(orders);
  total.subtract(sales);

  const computed_bal = total.value();
  const variance = end_bal - total.value();

  return {
    computed_bal,
    variance
  };
};

module.exports.recordCancelledOrders = (record, user, authorized_by = null) => {
  const datetime = moment.tz(moment(), process.env.TIMEZONE);
  const orders = [...record.orders];
  if (orders && orders.length > 0) {
    orders.forEach(order => {
      const items = [...order.items];
      if (items && items.length > 0) {
        items.forEach(order_item => {
          const deleted_item = {
            item: {
              ...order_item
            },
            user: {
              ...order.user
            },
            table_name: record.name,
            order_id: order.order_id,
            datetime: order.datetime,
            deleted: {
              user,
              datetime: moment.tz(moment(), process.env.TIMEZONE),
              authorized_by
            }
          };

          const newDeletedOrder = new DeletedOrder({
            ...deleted_item
          });

          newDeletedOrder.save();
        });
      }
    });
  }
};
