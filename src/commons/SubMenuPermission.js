import { Menu } from "antd";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { ACCESS_VIEW } from "./../utils/constants";
const { SubMenu } = Menu;

export default function SubMenuPermission({
  to,
  icon = "fa-folder-open",
  label,
  ...props
}) {
  const auth = useSelector((state) => state.auth);

  return (
    (
      auth?.user?.permissions
        ?.filter((o) => o?.access?.includes(ACCESS_VIEW))
        .map((o) => o.route) || []
    ).includes(to) /* true  */ && (
      <SubMenu key={to} {...props}>
        {props.children}
      </SubMenu>
    )
  );
}
