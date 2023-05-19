"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSchema = require("../schemas/jobFilter");

const router = new express.Router();

/**Create a new job
 * POST / { job } =>  { job }
 *
 * job should be { id, title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema, {
    required: true,
  });
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
 * - title
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let title;
  let minSalary;
  let hasEquity;

  if (req.query.minSalary) {
    minSalary = Number(req.query.minSalary);
  }
  if (req.query.hasEquity) {
    hasEquity = Boolean(req.query.hasEquity);
  }

  const queryResp = { title, minSalary, hasEquity };

  const result = jsonschema.validate(queryResp, jobFilterSchema, {
    required: true,
  });

  if (!result.valid) {
    // pass validation errors to error idr
    // (the "stack" key is generally the most useful)
    const errs = result.errors.map((err) => err.stack);
    throw new BadRequestError(errs);
  }

  const jobs = await Job.findAllWithFilter(req.query);

  return res.json({ jobs });
});

/**Get info about single job
 * GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle}
 *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
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

router.patch("/:id", ensureIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobUpdateSchema, {
    required: true,
  });
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.update(req.params.id, req.body);
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
