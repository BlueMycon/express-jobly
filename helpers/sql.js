"use strict";

const { BadRequestError } = require("../expressError");

/** SQL for Partial Update { dataToUpdate, jsToSql } =>  { setCols, values }
 *
 * dataToUpdate should be { firstName: 'Aliya', age: 32, ... }
 * jsToSql should be { colName: "col_name", ... }
 *
 * Returns { setCols, values  }
 * setCols should be '"first_name"=$1, "age"=$2'
 * values should be ['Aliya', 32, ...]
 *
 * Throws error if no data is sent to update
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
