/* istanbul ignore file */

/*
 * Copyright (c) Forward Email LLC
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *   WildDuck Mail Agent is licensed under the European Union Public License 1.2 or later.
 *   https://github.com/nodemailer/wildduck
 */

const Aliases = require('#models/aliases');
const Domains = require('#models/domains');
const refineAndLogError = require('#helpers/refine-and-log-error');

async function onGetQuota(path, session, fn) {
  this.logger.debug('GETQUOTA', { path, session });

  if (this.wsp) {
    try {
      const data = await this.wsp.request({
        action: 'get_quota',
        session: {
          id: session.id,
          user: session.user,
          remoteAddress: session.remoteAddress
        },
        path
      });
      fn(null, ...data);
    } catch (err) {
      fn(err);
    }

    return;
  }

  try {
    await this.refreshSession(session, 'GETQUOTA');

    if (path !== '') return fn(null, 'NONEXISTENT');

    const [storageUsed, maxQuotaPerAlias] = await Promise.all([
      Aliases.getStorageUsed({
        id: session.user.alias_id,
        domain: session.user.domain_id,
        locale: session.user.locale
      }),
      Domains.getMaxQuota(session.user.domain_id)
    ]);

    fn(null, {
      root: '',
      quota: maxQuotaPerAlias,
      storageUsed
    });
  } catch (err) {
    // NOTE: wildduck uses `imapResponse` so we are keeping it consistent
    if (err.imapResponse) {
      this.logger.error(err, { path, session });
      return fn(null, err.imapResponse);
    }

    fn(refineAndLogError(err, session, true, this));
  }
}

module.exports = onGetQuota;
