import React, { useState, useEffect } from "react";

import { Button } from "antd";

import { useSelector } from "react-redux";

import { SOCKET_ENDPOINT } from "../../utils/constants";
import socketIoClient from "socket.io-client";
import isEmpty from "../../validation/is-empty";

let socket = null;
export default function Authenticator({ other_set = false, history }) {
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState(null);
  const auth = useSelector((state) => state.auth);

  useEffect(() => {
    socket = socketIoClient(SOCKET_ENDPOINT);
    socket.on("request-authentication", (data) => {
      setToken(data.token);
      setMessage(data.message);
    });

    return () => {
      socket.close();
    };
  }, []);

  const onAuthenticate = () => {
    socket.emit("authenticate", {
      token: token,
      authenticate: true,
      user: auth.user,
    });

    setToken(null);
  };

  return (
    <div className="flex-1 is-flex align-items-center justify-content-center is-full-height">
      <div className="has-text-centered">
        {isEmpty(token) ? (
          <div>Waiting for authentication...</div>
        ) : (
          <div>
            <div className="has-text-weight-bold">{message}</div>
            <Button onClick={() => onAuthenticate()}>Authenticate</Button>
          </div>
        )}
      </div>
    </div>
  );
}
