import numeral from "numeral";
import round from "./round";
export default ({ quantity = 0, price = 0 }) => {
  console.log(quantity, price);
  const gross_amount = round(quantity * price);
  const discount_amount = 0;
  const amount = gross_amount - discount_amount;

  return {
    quantity,
    price,
    gross_amount,
    discount_amount,
    amount,
  };
};
