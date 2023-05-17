"use strict";
const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("works", function () {
    const dataToUpdate = { firstName: 'Aliya', age: 32 };
    const jsToSql = { firstName: "first_name", age: "age" };
    const sql = sqlForPartialUpdate(dataToUpdate, jsToSql);

    expect(sql).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ['Aliya', 32],
    });
  });


  test("bad request if no data", function () {
    const dataToUpdate = {};
    const jsToSql = { firstName: "first_name", age: "age" };

    expect(() => sqlForPartialUpdate(dataToUpdate, jsToSql)).toThrow(BadRequestError);
  });
});
