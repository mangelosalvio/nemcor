module.exports = (req) => {
  const request_body = { ...req.body };

  const req_body_filtered = Object.keys(request_body)
    .filter((key) => key !== "_id")
    .reduce((obj, key) => {
      obj[key] = request_body[key];
      return obj;
    }, {});

  return req_body_filtered;
};
