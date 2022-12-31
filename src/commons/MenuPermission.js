import { Menu } from "antd";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { ACCESS_VIEW } from "./../utils/constants";

export default function MenuPermission({
  to = "/key",
  icon = "fa-folder-open",
  label,
  ...props
}) {
  const auth = useSelector((state) => state.auth);
  useEffect(() => {
    return () => {};
  }, []);

  return (
    (
      auth?.user?.permissions
        ?.filter((o) => o?.access?.includes(ACCESS_VIEW))
        .map((o) => o.route) || []
    ).includes(to) /* true  */ && (
      <Menu.Item key={to} {...props}>
        <Link to={to}>
          <span>
            <i className={`fas ${icon}`}></i>
            {label}
          </span>
        </Link>
      </Menu.Item>
    )
  );
}
