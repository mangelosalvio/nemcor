import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useMemo,
  useCallback,
} from "react";
import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Row,
  Col,
  Button,
  Divider,
  message,
  List,
} from "antd";

import {
  formItemLayout,
  smallFormItemLayout,
  smallTailFormItemLayout,
  tailFormItemLayout,
} from "./../../utils/Layouts";

import { useSelector } from "react-redux";

import ReportHeading from "../../utils/ReportHeading";
import ReportFooter from "../../utils/ReportFooter";
import moment from "moment";

import axios from "axios";
import numberFormat from "../../utils/numberFormat";
import { addKeysToArray } from "../utils/utilities";
import ReactToPrint from "react-to-print";
import {
  authenticateOwner,
  authenticateAdmin,
} from "../../utils/authentications";
import SelectFieldGroup from "../../commons/SelectFieldGroup";
import CheckboxGroupFieldGroup from "../../commons/CheckboxGroupFieldGroup";
import { onChange } from "../../utils/form_utilities";
import { onTieupSearch } from "../../utils/utilities";
import { debounce } from "lodash";

const { Content } = Layout;

const url = "/api/products/";
const report_url = "per-category";
const title = "Tie-up Prices Report";

const initialValues = {
  period_covered: [moment().startOf("week"), moment().endOf("week")],
  tieup: null,
};

const records_column = [
  {
    title: "Item",
    dataIndex: ["name"],
  },

  {
    title: "Price",
    dataIndex: ["price"],
    width: 70,
    align: "right",
    render: (value) => numberFormat(value),
  },
];

export default function TieupPricesReport({ other_set = false, history }) {
  const [records, setRecords] = useState([]);
  const auth = useSelector((state) => state.auth);
  const [state, setState] = useState(initialValues);

  const report = useRef(null);
  const [categories, setCategories] = useState([]);
  const [options, setOptions] = useState({
    tieups: [],
  });

  useEffect(() => {
    axios.get(`/api/categories`).then((response) => {
      if (response.data) {
        setCategories(response.data.map((o) => o.name));
      }
    });

    return () => {};
  }, []);

  useEffect(() => {
    let authenticate = other_set ? authenticateOwner : authenticateAdmin;

    authenticate({
      role: auth.user?.role,
      history,
    });
    return () => {};
  }, []);

  const getRecords = useCallback(
    debounce(({ tieup, categories }) => {
      const form_data = {
        tieup: tieup,
        categories: categories,
      };

      const loading = message.loading("Loading...");
      axios
        .post(`${url}${report_url}`, form_data)
        .then((response) => {
          loading();
          if (response.data) {
            let records = [...response.data];

            records = records.map((record) => {
              let items = record.items.map((item) => {
                let tieup_price = item.price;

                const tieup_info = (item.tieup_prices || []).find((t) => {
                  return t.tieup.name === tieup?.name;
                });

                if (tieup_info) {
                  tieup_price = tieup_info.price;
                }

                return {
                  ...item,
                  price: tieup_price,
                };
              });

              return { ...record, items };
            });

            setRecords(records);
          }
        })
        .catch((err) => {
          loading();
          message.error("There was an error processing your request");
        });
    }, 500),
    []
  );

  useEffect(() => {
    getRecords({ tieup: state.tieup, categories: state.categories });
    return () => {};
  }, [state.tieup, auth.user, history, other_set, state.categories]);

  const list = useMemo(() => {
    return (
      <List
        dataSource={records}
        renderItem={(category) => (
          <div className="m-t-1">
            <div>{category._id}</div>
            <Table
              size="small"
              dataSource={addKeysToArray([...category.items])}
              columns={records_column}
              pagination={false}
              rowClassName={(record, index) => {
                if (record.footer === 1) {
                  return "footer-summary has-text-weight-bold";
                }
              }}
            />
          </div>
        )}
      />
    );
  }, [records]);

  return (
    <Content style={{ padding: "0 50px" }}>
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Reports</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
        <Divider />
        <Row>
          <Col span={24}>
            <Form>
              <SelectFieldGroup
                label="Tieup"
                name="name"
                value={state.tieup && state.tieup.name}
                onChange={(index) => {
                  setState((prevState) => {
                    return {
                      ...prevState,
                      tieup: options.tieups[index],
                    };
                  });
                }}
                onSearch={(value) => {
                  onTieupSearch({ value, options, setOptions });
                }}
                formItemLayout={formItemLayout}
                data={options.tieups}
                autoFocus={true}
              />
            </Form>
          </Col>
        </Row>
        <Row>
          <Col span={24} className="search-col">
            <CheckboxGroupFieldGroup
              label="Categories"
              name="categories"
              onChange={(value) => {
                onChange({
                  key: "categories",
                  value,
                  setState,
                });
              }}
              value={state.categories}
              options={categories}
              formItemLayout={formItemLayout}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item {...tailFormItemLayout} className="field is-grouped">
              <ReactToPrint
                trigger={() => (
                  <Button type="primary" className="m-l-1">
                    Print
                  </Button>
                )}
                bodyClass="print"
                content={() => report.current}
              />
            </Form.Item>
          </Col>
        </Row>
        <div ref={report}>
          <div className="report-heading">
            <ReportHeading />
            <span className="has-text-weight-bold">{title}</span>
            <br />
            {state?.tieup?.name}
            <br />
            Printed By : {auth.user.name} <br />
            Date/Time Printed : {moment().format("LLL")}
          </div>

          {list}

          <div className="report-heading m-t-1">
            <ReportFooter />
          </div>
        </div>
      </div>
    </Content>
  );
}
