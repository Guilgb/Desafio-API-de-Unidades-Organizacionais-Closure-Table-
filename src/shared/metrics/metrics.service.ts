import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('users_created_total')
    private readonly usersCreatedCounter: Counter<string>,

    @InjectMetric('groups_created_total')
    private readonly groupsCreatedCounter: Counter<string>,

    @InjectMetric('user_group_associations_total')
    private readonly userGroupAssociationsCounter: Counter<string>,

    @InjectMetric('database_query_duration_seconds')
    private readonly dbQueryDurationHistogram: Histogram<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDurationHistogram: Histogram<string>,

    @InjectMetric('database_connections_active')
    private readonly dbConnectionsGauge: Gauge<string>,

    @InjectMetric('total_users')
    private readonly totalUsersGauge: Gauge<string>,

    @InjectMetric('total_groups')
    private readonly totalGroupsGauge: Gauge<string>,

    @InjectMetric('errors_total')
    private readonly errorsCounter: Counter<string>,
  ) {}

  incrementUsersCreated(status: 'success' | 'failure') {
    this.usersCreatedCounter.inc({ status });
  }

  setTotalUsers(count: number) {
    this.totalUsersGauge.set(count);
  }

  incrementGroupsCreated(status: 'success' | 'failure') {
    this.groupsCreatedCounter.inc({ status });
  }

  setTotalGroups(count: number) {
    this.totalGroupsGauge.set(count);
  }

  incrementUserGroupAssociation(
    action: 'associate' | 'disassociate',
    status: 'success' | 'failure',
  ) {
    this.userGroupAssociationsCounter.inc({ action, status });
  }

  observeDbQueryDuration(
    durationInSeconds: number,
    queryType: string,
    entity: string,
  ) {
    this.dbQueryDurationHistogram.observe(
      { query_type: queryType, entity },
      durationInSeconds,
    );
  }

  setActiveDbConnections(count: number) {
    this.dbConnectionsGauge.set(count);
  }

  observeHttpRequestDuration(
    durationInSeconds: number,
    method: string,
    route: string,
    statusCode: number,
  ) {
    this.httpRequestDurationHistogram.observe(
      { method, route, status_code: statusCode.toString() },
      durationInSeconds,
    );
  }

  incrementErrors(errorType: string, endpoint: string) {
    this.errorsCounter.inc({ error_type: errorType, endpoint });
  }
}
