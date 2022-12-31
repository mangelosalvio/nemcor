import React from "react";
import classnames from "classnames";
import { Input, Button } from "antd";
const Search = Input.Search;

export default ({
  name,
  value,
  onSearch,
  onChange,
  onNew,
  newButtonVisibility = true,
}) => {
  return (
    <form onSubmit={onSearch} style={{ margin: "16px 0px" }}>
      <div className="columns">
        <div className="column">
          <div className="field " align="right">
            {onSearch && (
              <Search
                name={name}
                placeholder="Search keyword"
                value={value}
                onSearch={onSearch}
                onChange={onChange}
                style={{ width: 200 }}
              />
            )}

            {onNew && (
              <Button
                style={{ marginLeft: "0.5rem" }}
                className={classnames("control", {
                  "display-none": !newButtonVisibility,
                })}
                onClick={onNew}
              >
                New
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
