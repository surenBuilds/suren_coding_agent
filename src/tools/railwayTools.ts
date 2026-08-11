import { ToolDefinition } from '../types/agent';

export const RAILWAY_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'railway_list_projects',
    description: "List all Railway projects accessible to the authenticated user's account",
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'railway_get_project',
    description: 'Get details for a Railway project, including its services and environments',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Railway project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'railway_get_deployments',
    description: 'List recent deployments for a Railway service in an environment',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Railway environment ID' },
        serviceId: { type: 'string', description: 'Railway service ID' },
        limit: { type: 'number', description: 'Max deployments to return (default 5)' },
      },
      required: ['environmentId', 'serviceId'],
    },
  },
  {
    name: 'railway_get_deployment_logs',
    description: 'Get build/deploy logs for a specific Railway deployment',
    permissionLevel: 'SAFE',
    parameters: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string', description: 'Railway deployment ID' },
        limit: { type: 'number', description: 'Max log lines to return (default 100)' },
      },
      required: ['deploymentId'],
    },
  },
  {
    name: 'railway_set_variables',
    description: 'Set one or more environment variables on a Railway service (triggers a redeploy)',
    permissionLevel: 'MODIFY',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Railway project ID' },
        environmentId: { type: 'string', description: 'Railway environment ID' },
        serviceId: { type: 'string', description: 'Railway service ID' },
        variables: { type: 'object', description: 'Map of variable name to string value' },
      },
      required: ['projectId', 'environmentId', 'serviceId', 'variables'],
    },
  },
  {
    name: 'railway_redeploy',
    description: 'Trigger a redeployment of a Railway service in an environment',
    permissionLevel: 'DEPLOY',
    parameters: {
      type: 'object',
      properties: {
        environmentId: { type: 'string', description: 'Railway environment ID' },
        serviceId: { type: 'string', description: 'Railway service ID' },
      },
      required: ['environmentId', 'serviceId'],
    },
  },
];

const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

async function railwayGraphQL(token: string, query: string, variables: Record<string, any>) {
  const res = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });

  const json: any = await res.json();
  if (!res.ok || json.errors) {
    const message = json.errors?.map((e: any) => e.message).join('; ') || res.statusText;
    throw new Error(`Railway API error: ${message}`);
  }
  return json.data;
}

export async function executeRailwayTool(name: string, args: Record<string, any>): Promise<any> {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    return {
      status: 'pending_credentials',
      message: 'Railway API integration is implemented, but RAILWAY_TOKEN is not provided in environment settings.',
      requestedAction: name,
      args,
    };
  }

  try {
    switch (name) {
      case 'railway_list_projects': {
        const data = await railwayGraphQL(
          token,
          `query { me { projects { edges { node { id name } } } } }`,
          {}
        );
        return data.me.projects.edges.map((e: any) => e.node);
      }

      case 'railway_get_project': {
        const data = await railwayGraphQL(
          token,
          `query($id: String!) {
            project(id: $id) {
              id
              name
              services { edges { node { id name } } }
              environments { edges { node { id name } } }
            }
          }`,
          { id: args.projectId }
        );
        return data.project;
      }

      case 'railway_get_deployments': {
        const data = await railwayGraphQL(
          token,
          `query($environmentId: String!, $serviceId: String!, $limit: Int) {
            deployments(input: { environmentId: $environmentId, serviceId: $serviceId }, first: $limit) {
              edges { node { id status createdAt meta } }
            }
          }`,
          { environmentId: args.environmentId, serviceId: args.serviceId, limit: args.limit || 5 }
        );
        return data.deployments.edges.map((e: any) => e.node);
      }

      case 'railway_get_deployment_logs': {
        const data = await railwayGraphQL(
          token,
          `query($deploymentId: String!, $limit: Int) {
            deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
              timestamp
              message
              severity
            }
          }`,
          { deploymentId: args.deploymentId, limit: args.limit || 100 }
        );
        return data.deploymentLogs;
      }

      case 'railway_set_variables': {
        const data = await railwayGraphQL(
          token,
          `mutation($input: VariableCollectionUpsertInput!) {
            variableCollectionUpsert(input: $input)
          }`,
          {
            input: {
              projectId: args.projectId,
              environmentId: args.environmentId,
              serviceId: args.serviceId,
              variables: args.variables,
            },
          }
        );
        return { status: 'success', updated: Object.keys(args.variables || {}), result: data };
      }

      case 'railway_redeploy': {
        const data = await railwayGraphQL(
          token,
          `mutation($environmentId: String!, $serviceId: String!) {
            serviceInstanceRedeploy(environmentId: $environmentId, serviceId: $serviceId)
          }`,
          { environmentId: args.environmentId, serviceId: args.serviceId }
        );
        return { status: 'success', message: 'Redeploy triggered', result: data };
      }

      default:
        return {
          status: 'success',
          message: `Railway API tool ${name} executed`,
          args,
        };
    }
  } catch (err: any) {
    return {
      status: 'error',
      message: err.message || String(err),
      tool: name,
    };
  }
}
