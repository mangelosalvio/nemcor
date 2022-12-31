import React, { useEffect, useState } from "react";
import TextFieldGroup from "../../commons/TextFieldGroup";
import Searchbar from "../../commons/Searchbar";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  Row,
  Col,
  message,
} from "antd";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined } from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";
import { useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onChange,
} from "../../utils/form_utilities";
import moment from "moment";
import DatePickerFieldGroup from "../../commons/DatePickerFieldGroup";
import numberFormat from "../../utils/numberFormat";
import { authenticateAdmin } from "../../utils/authentications";
import Dragger from "antd/lib/upload/Dragger";
import confirm from "antd/lib/modal/confirm";
import { LazyLoadImage } from "react-lazy-load-image-component";
import axios from "axios";

const { Content } = Layout;

const url = "/api/companies/";
const title = "Company Form";

const initialValues = {
  _id: null,
  name: "",
};
const date_fields = [];
export default function CompanyForm({ history }) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const auth = useSelector((state) => state.auth);

  const [state, setState] = useState(initialValues);

  const records_column = [
    {
      title: "Company Code",
      dataIndex: "company_code",
    },
    {
      title: "Name",
      dataIndex: "name",
    },

    {
      title: "",
      key: "action",
      width: 10,
      render: (text, record) => (
        <span
          onClick={() =>
            edit({
              record,
              setErrors,
              setRecords,
              url,
              setState,
            })
          }
        >
          <i className="fas fa-edit"></i>
        </span>
      ),
    },
  ];

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });
    return () => {};
  }, []);

  const props = {
    name: "file",
    accept: ".jpg,.jpeg,.png",
    action: `/api/companies/${state._id}/upload`,
    showUploadList: false,
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
        edit({
          record: {
            _id: state._id,
          },
          setErrors,
          setRecords,
          url,
          setState,
        });
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const showDeleteConfirm = (image) => {
    confirm({
      title: "Delete Image",
      content: "Would you like to delete selected image?",
      okText: "Delete",
      okType: "danger",
      cancelText: "No",
      onOk() {
        axios
          .post(`/api/companies/${state._id}/delete-image`, {
            image,
          })
          .then((response) => {
            setState(initialValues);
            edit({
              record: {
                _id: state._id,
              },
              setErrors,
              setRecords,
              url,
              setState,
            });
          });
      },
      onCancel() {
        console.log("Cancel");
      },
    });
  };

  return (
    <Content className="content-padding">
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <div className="column">
          <Searchbar
            name="search_keyword"
            onSearch={(value, e) => {
              e.preventDefault();
              onSearch({
                page: 1,
                search_keyword,
                url,
                setRecords,
                setTotalRecords,
                setCurrentPage,
                setErrors,
              });
            }}
            onChange={(e) => setSearchKeyword(e.target.value)}
            value={search_keyword}
            onNew={() => {
              setRecords([]);
              setState(initialValues);
            }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
        <Divider />
        {isEmpty(records) ? (
          <Form
            onFinish={() => {
              onSubmit({
                values: state,
                auth,
                url,
                setErrors,
                setState,
                date_fields,
              });
            }}
            initialValues={initialValues}
          >
            <TextFieldGroup
              label="Company Code"
              name="company_code"
              error={errors.company_code}
              formItemLayout={formItemLayout}
              value={state.company_code}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            <TextFieldGroup
              label="Name"
              name="name"
              error={errors.name}
              formItemLayout={formItemLayout}
              value={state.name}
              onChange={(e) => {
                onChange({
                  key: e.target.name,
                  value: e.target.value,
                  setState,
                });
              }}
            />

            {!isEmpty(state._id) && [
              <Row className="ant-form-item" key="uploader">
                <Col span={4} className="ant-form-item-label">
                  <label>Logo</label>
                </Col>
                <Col span={20}>
                  <Dragger {...props}>
                    <p className="ant-upload-text">
                      Click or drag file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                      Support .jpg files not exceeding 2MB
                    </p>
                  </Dragger>
                </Col>
              </Row>,
              <Row className="ant-form-item" key="images">
                <Col span={4}></Col>
                <Col span={20}>
                  {state.logo && (
                    <div
                      key={state.logo?.filename}
                      onClick={() => showDeleteConfirm(state.logo)}
                      className="checkout-image"
                    >
                      <LazyLoadImage
                        src={`/public/images/${state.logo?.filename}`}
                      />
                    </div>
                  )}
                </Col>
              </Row>,
            ]}

            <Form.Item className="m-t-1" {...tailFormItemLayout}>
              <div className="field is-grouped">
                <div className="control">
                  <button className="button is-small is-primary">Save</button>
                </div>
                {!isEmpty(state._id) ? (
                  <span
                    className="button is-danger is-outlined is-small"
                    onClick={() => {
                      onDelete({
                        id: state._id,
                        url,
                      });
                      setState(initialValues);
                    }}
                  >
                    <span>Delete</span>
                    <span>
                      <i className="fas fa-times"></i>
                    </span>
                  </span>
                ) : null}
              </div>
            </Form.Item>
          </Form>
        ) : (
          <Table
            dataSource={records}
            columns={records_column}
            rowKey={(record) => record._id}
            pagination={{
              current: current_page,
              defaultCurrent: current_page,
              onChange: (page) =>
                onSearch({
                  page,
                  search_keyword,
                  url,
                  setRecords,
                  setTotalRecords,
                  setCurrentPage,
                  setErrors,
                }),
              total: total_records,
              pageSize: 10,
            }}
          />
        )}
      </div>
    </Content>
  );
}
