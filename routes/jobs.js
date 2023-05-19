"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSchema = require("../schemas/jobFilter.json");

const router = new express.Router();

/**Create a new job
 * POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
  const { title, salary, equity, companyHandle } = req.body;
  // TODO: validate equity via decimal.js
  const validator = jsonschema.validate(
    { title, salary, equity: Number(equity), companyHandle },
    jobNewSchema,
    { required: true }
  );
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** Get info about all jobs
 * GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - titleLike (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let { titleLike, minSalary, hasEquity } = req.query;

  if (minSalary) {
    minSalary = Number(minSalary);
  }

  let jobFilters = {};

  for (let [key, value] of Object.entries({titleLike, minSalary, hasEquity})) {
    if (value !== undefined) {
      jobFilters[key] = value;
    }
  }

  const result = jsonschema.validate(jobFilters, jobFilterSchema, {
    required: true,
  });

  if (!result.valid) {
    // pass validation errors to error idr
    // (the "stack" key is generally the most useful)
    const errs = result.errors.map((err) => err.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAllWithFilter(jobFilters);
  return res.json({ jobs });
});

/**Get info about single job
 * GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(Number(req.params.id));
  return res.json({ job });
});

/** Update job info
 * PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

// TODO: middleware for URL param type integer
// TODO: what if you want path/:id and also path/:name for same path?
router.patch("/:id", ensureIsAdmin, async function (req, res, next) {
  let { title, salary, equity } = req.body;
  equity = Number(equity)

  let jobData = {};
  for (let [key, value] of Object.entries({title, salary, equity})) {
    if (value) {
      jobData[key] = value;
    }
  }

  const validator = jsonschema.validate(
    jobData,
    jobUpdateSchema,
    { required: true }
  );
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, jobData);
  return res.json({ job });
});

/**Delete a job
 * DELETE /[id]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete("/:id", ensureIsAdmin, async function (req, res, next) {
  await Job.remove(req.params.id);
  return res.json({ deleted: req.params.id });
});

module.exports = router;
