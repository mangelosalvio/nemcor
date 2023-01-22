import React, { useEffect, useState } from "react";

import {
  Layout,
  Breadcrumb,
  Form,
  Table,
  Divider,
  message,
  Checkbox,
  Row,
  Col,
  Button,
} from "antd";

import { formItemLayout, tailFormItemLayout } from "./../../utils/Layouts";
import { EditOutlined, CloseOutlined } from "@ant-design/icons";
import isEmpty from "../../validation/is-empty";

import { useDispatch, useSelector } from "react-redux";
import {
  edit,
  onDelete,
  onSubmit,
  onSearch,
  onChange,
} from "../../utils/form_utilities";
import { authenticateAdmin } from "../../utils/authentications";
import SelectTagFieldGroup from "../../commons/SelectTagsFieldGroup";
import axios from "axios";
import SimpleSelectFieldGroup from "../../commons/SimpleSelectFieldGroup";
import { permission_options, roles_options } from "../../utils/Options";
import async from "async";
import { onRoleSearch } from "../../utils/utilities";
import { logoutUser } from "../../actions/authActions";
import { useNavigate } from "react-router-dom";

const CheckboxGroup = Checkbox.Group;

const { Content } = Layout;

const url = "/api/permissions/";
const title = "Permissions";

const initialValues = {
  role: "",
  permissions: [],
};

const onChangeAccess = ({ role, name, route, access, parent_menu }) => {
  axios
    .post("/api/role-permissions", {
      role,
      route,
      permission: {
        name,
        route,
        access,
        parent_menu,
      },
    })
    .then(() => {})
    .catch((err) => {
      message.error("There was an error updating permissions");
    });
};

export default function PermissionsForm({}) {
  const [errors, setErrors] = useState({});
  const [records, setRecords] = useState([]);
  const [state, setState] = useState(initialValues);
  const [options, setOptions] = useState({
    menu_routes: [],
    roles: [],
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [total_records, setTotalRecords] = useState(null);
  const [current_page, setCurrentPage] = useState(1);
  const [search_keyword, setSearchKeyword] = useState("");
  const [parent_menus, setParentMenus] = useState([]);

  const auth = useSelector((state) => state.auth);

  useEffect(() => {
    authenticateAdmin({
      role: auth.user?.role,
      history,
    });

    onRoleSearch({ value: "", options, setOptions });

    axios
      .get("/api/menu-routes/parent-menus")
      .then((response) => {
        if (response.data) {
          setParentMenus(response.data);
        }
      })
      .catch((err) =>
        message.error("There was an error processing your request")
      );

    return () => {};
  }, []);

  useEffect(() => {
    if (state.role && state.parent_menu) {
      const loading = message.loading("Loading...");
      async.parallel(
        {
          menu_routes: (cb) => {
            axios
              .post("/api/menu-routes/listing", {
                parent_menu: state.parent_menu,
              })
              .then((response) => {
                cb(null, response.data || []);
              })
              .catch((err) => {
                message.error("There was an error processing your request");
              });
          },
          roles: (cb) => {
            axios
              .post("/api/role-permissions/role", {
                role: state.role,
                parent_menu: state.parent_menu,
              })
              .then((response) => {
                cb(null, response.data);
              });
          },
        },
        (err, results) => {
          loading();
          if (err) {
            return;
          }
          let permissions = [];

          results.menu_routes.forEach((menu_route) => {
            const permission = (results.roles?.permissions || []).find((o) => {
              return o.route === menu_route.route;
            });
            /* console.log("menu_route : " + menu_route.route);
            console.log("role permission : " + results.roles?.permissions);
            console.log("permission : " + permission); */

            if (permission) {
              permissions = [
                ...permissions,
                { ...permission, parent_menu: menu_route.parent_menu },
              ];
            } else {
              permissions = [
                ...permissions,
                {
                  name: menu_route.name,
                  route: menu_route.route,
                  parent_menu: menu_route.parent_menu,
                  access: [],
                },
              ];
            }
          });

          setState((prevState) => {
            return {
              ...prevState,
              permissions,
            };
          });
        }
      );
    }
    return () => {};
  }, [state.role, state.parent_menu]);

  return (
    <Content className="content-padding">
      <div className="columns is-marginless">
        <div className="column">
          <Breadcrumb style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>{title}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 24, minHeight: 280 }}>
        <span className="module-title">{title}</span>
        <Divider />

        <Form
          onFinish={(values) => {
            const loading = message.loading("Loading...");
            const form_data = {
              role: state.role,
              permissions: state.permissions,
            };
            axios
              .put("/api/role-permissions", form_data)
              .then((response) => {
                loading();
                message.success("Permissions Saved");
                setState(response.data);
              })
              .catch((err) => {
                loading();
                message.error("There was a problem processing your request.");
              });
          }}
          initialValues={initialValues}
        >
          <SimpleSelectFieldGroup
            label="Role"
            name="role"
            value={state.role}
            error={errors.role}
            formItemLayout={formItemLayout}
            onChange={(value) => {
              onChange({
                key: "role",
                value,
                setState,
              });
            }}
            options={(options.roles || [])?.map((o) => o.name)}
          />

          <SimpleSelectFieldGroup
            label="Menu"
            name="parent_menu"
            value={state.parent_menu}
            error={errors.parent_menu}
            formItemLayout={formItemLayout}
            onChange={(value) => {
              onChange({
                key: "parent_menu",
                value,
                setState,
              });
            }}
            options={parent_menus.map((o) => o.parent_menu)}
          />

          <Form.Item label="Permissions" {...formItemLayout}>
            <Checkbox.Group
              value={state.permissions}
              onChange={(values) => {
                setState((prevState) => ({
                  ...prevState,
                  permissions: values,
                }));
              }}
            >
              {(state.permissions || []).map((o, i) => (
                <Row key={i} gutter={8} className="m-t-1">
                  <Col>
                    <div className="has-text-weight-bold">{o.name}</div>
                    <div>
                      <CheckboxGroup
                        value={o.access}
                        onChange={(values) => {
                          onChangeAccess({
                            role: state.role,
                            name: o.name,
                            route: o.route,
                            access: values,
                            parent_menu: o.parent_menu,
                          });

                          let permissions = [...state.permissions];
                          permissions[i].access = values;

                          setState((prevState) => ({
                            ...prevState,
                            permissions,
                          }));
                        }}
                        options={permission_options}
                      />
                    </div>
                  </Col>
                </Row>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <Form.Item className="m-t-1" {...tailFormItemLayout}>
            <Button
              size="large"
              onClick={() => {
                navigate("/dashboard");
              }}
            >
              Exit
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Content>
  );
}
