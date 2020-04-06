import { DataSource, DataSourceConfig } from 'apollo-datasource'
import { GraphQLSchema, print, ExecutionResult } from 'graphql'
import { introspectSchema, makeRemoteExecutableSchema } from 'graphql-tools'
import { Fetcher } from 'graphql-tools/dist/stitching/makeRemoteExecutableSchema'
import { ExecutionResultDataDefault } from 'graphql/execution/execute'
// @ts-ignore
import { digest } from 'json-hash'
import fetch, { Request, RequestInfo } from 'node-fetch'
import { GraphQLAutoRequester, AutoGraphQLObjectType } from 'graphql-auto-requester'

export class GraphQLAutoRequesterDataSource<TContext = any> extends DataSource<TContext> {
  static schemaDocument?: string | GraphQLSchema | Promise<string | GraphQLSchema>

  baseURL?: RequestInfo
  context?: TContext
  executableSchema?: GraphQLSchema
  requester?: GraphQLAutoRequester
  query?: AutoGraphQLObjectType

  willSendRequest?(request: Request): void | Promise<void>;

  async initialize ({ context }: DataSourceConfig<TContext>) {
    this.context = context
    if (!this.executableSchema) {
      // TODO: Remove this cache when this issue is resolved: https://github.com/apollographql/graphql-tools/issues/1346
      const cache: { [index: string]: Promise<ExecutionResult<ExecutionResultDataDefault>> } = {}

      const fetcher: Fetcher = ({
        query,
        operationName,
        variables
      }) => {
        const body = {
          query: print(query),
          variables,
          operationName
        }
        const hash = digest(body)
        if (!Object.prototype.hasOwnProperty.call(cache, hash)) {
          cache[hash] = (async () => {
            let request: Request
            try {
              request = new Request(this.baseURL!, {
                method: 'POST',
                body: JSON.stringify(body)
              })
              if (this.willSendRequest) {
                await this.willSendRequest(request)
              }
              const response = await fetch(request)
              const data = await response.json()
              return data
            } catch (err) {
              if (!this.didEncounterError) {
                throw err
              }
              return this.didEncounterError(err, request!)
            }
          })()
        }
        return cache[hash]
      }

      const klass = this.constructor as typeof GraphQLAutoRequesterDataSource
      if (!klass.schemaDocument) {
        klass.schemaDocument = introspectSchema(fetcher)
      }
      const schema = await klass.schemaDocument

      this.executableSchema = makeRemoteExecutableSchema({
        schema: schema!,
        fetcher
      })
    }
    this.requester = new GraphQLAutoRequester(this.executableSchema)
    this.query = this.requester.query
  }

  didEncounterError (error: Error, _request: Request) {
    throw error
  }
}

export default GraphQLAutoRequesterDataSource
