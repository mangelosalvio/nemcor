import isEmpty from "../validation/is-empty";
import axios from "axios";

export const getProductTieupPrice = ({
  product,
  tieup = null,
  retail = false,
}) => {
  return new Promise((resolve, reject) => {
    if (retail) {
      return resolve({ price: product.price });
    }

    if (isEmpty(tieup)) {
      if (retail) {
        return resolve({ price: product.price });
      }

      let price = isEmpty(product.price) ? product.price : product.price;

      resolve({ price });
      return;
    }

    axios
      .post(`/api/products/${product._id}/tieup-price`, { tieup })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};

export const getCustomerPrice = ({ product, customer = null }) => {
  return new Promise((resolve, reject) => {
    if (customer?._id) {
      return resolve({ price: product.wholesale_price });
    }

    return resolve({ price: product.price });
  });
};
