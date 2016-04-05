import _ from 'lodash';
import QueryBuilderBase from '../QueryBuilderBase';
import QueryBuilderMethod from './QueryBuilderMethod';
import {isKnexQueryBuilder} from '../../utils/dbUtils';

export default class ArgumentQueryBuilderMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.args = null;
  }

  /**
   * @param {QueryBuilderBase} builder
   * @param {Array.<*>} args
   * @returns {boolean}
   */
  call(builder, args) {
    if (!wrapArgs(args, builder.knex())) {
      return false;
    }

    this.args = args;
    return super.call(builder, this.args);
  }
}

function wrapArgs(args, knex) {
  for (let i = 0, l = args.length; i < l; ++i) {
    if (_.isUndefined(args[i])) {
      // None of the query builder methods should accept undefined. Do nothing if
      // one of the arguments is undefined. This enables us to do things like
      // `.where('name', req.query.name)` without checking if req.query has the
      // property `name`.
      return false;
    } else if (args[i] instanceof QueryBuilderBase) {
      // Convert QueryBuilderBase instances into knex query builders.
      args[i] = args[i].build();
    } else if (_.isFunction(args[i])) {
      // If an argument is a function, knex calls it with a query builder as
      // `this` context. We call the function with a QueryBuilderBase as
      // `this` context instead.
      args[i] = wrapFunctionArg(args[i], knex);
    }
  }

  return true;
}

function wrapFunctionArg(func, knex) {
  return function () {
    if (isKnexQueryBuilder(this)) {
      // Wrap knex query builder into a QueryBuilderBase so that we can use
      // our extended query builder in nested queries.
      const builder = new QueryBuilderBase(knex);
      func.call(builder, builder);
      builder.buildInto(this);
    } else {
      return func.apply(this, arguments);
    }
  };
}