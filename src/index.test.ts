/* eslint-disable import/first */
import fetch from 'node-fetch'
jest.mock('node-fetch')
const graphqlTools = require('graphql-tools')

import { DataSourceConfig } from 'apollo-datasource'
import { buildSchema, GraphQLField } from 'graphql'

import { GraphQLAutoRequesterDataSource } from './index'

// @ts-ignore cache is unused, so we don't need it in the DataSourceConfig
const dataSourceConfig: DataSourceConfig = { context: {} }

const schemaDocument = `
type Query {
  fieldA: Int!
}
`

describe('GraphQLAutoRequesterDataSource', () => {
  beforeEach(() => {
    ;(fetch as any as jest.Mock).mockClear()
    ;(fetch as any as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        data: {
          fieldA: 1
        }
      })
    })
  })

  describe('When using introspection', () => {
    class TestDataSource extends GraphQLAutoRequesterDataSource {
      constructor () {
        super()
        this.baseURL = 'test'
      }
    }

    let instance: TestDataSource
    beforeEach(() => {
      instance = new TestDataSource()
      jest.spyOn(graphqlTools, 'introspectSchema').mockResolvedValue(buildSchema(schemaDocument))
    })
    afterEach(() => {
      graphqlTools.introspectSchema.mockReset()
    })

    it('introspects on first initialize', async () => {
      await instance.initialize(dataSourceConfig)
      expect(graphqlTools.introspectSchema).toHaveBeenCalledTimes(1)

      await expect(instance.query!.fieldA).resolves.toBe(1)

      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('does not introspect on additional initializations', async () => {
      await instance.initialize(dataSourceConfig)
      expect(graphqlTools.introspectSchema).toHaveBeenCalledTimes(0)

      await expect(instance.query!.fieldA).resolves.toBe(1)

      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('When extending to provide a schemaDocument', () => {
    class TestDataSource extends GraphQLAutoRequesterDataSource {
      constructor () {
        super()
        this.baseURL = 'test'
      }
    }

    TestDataSource.schemaDocument = schemaDocument

    let instance: TestDataSource
    beforeEach(() => {
      instance = new TestDataSource()
    })

    describe('without willSendRequest', () => {
      it('resolves a field correctly', async () => {
        await instance.initialize(dataSourceConfig)
        expect(fetch).toHaveBeenCalledTimes(0)

        await expect(instance.query!.fieldA).resolves.toBe(1)

        expect(fetch).toHaveBeenCalledTimes(1)
      })
    })

    describe('with willSendRequest', () => {
      beforeEach(() => {
        instance.willSendRequest = jest.fn().mockResolvedValue(undefined)
      })

      it('calls willSendRequest', async () => {
        await instance.initialize(dataSourceConfig)
        expect(fetch).toHaveBeenCalledTimes(0)

        await expect(instance.query!.fieldA).resolves.toBe(1)

        expect(instance.willSendRequest).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('When extending to provide an executable schema', () => {
    const schema = buildSchema(schemaDocument)
    class TestDataSource extends GraphQLAutoRequesterDataSource {
      constructor () {
        super()
        this.baseURL = 'test'
        this.executableSchema = schema
      }
    }

    let instance: TestDataSource
    let fieldA: GraphQLField<{}, {}>
    beforeEach(() => {
      fieldA = schema.getQueryType()?.getFields()?.fieldA!
      fieldA.resolve = jest.fn().mockResolvedValue(1)
      instance = new TestDataSource()
    })

    describe('without willSendRequest', () => {
      it('resolves a field correctly', async () => {
        await instance.initialize(dataSourceConfig)
        expect(fetch).toHaveBeenCalledTimes(0)

        await expect(instance.query!.fieldA).resolves.toBe(1)

        expect(fetch).toHaveBeenCalledTimes(0)
        expect(fieldA.resolve).toHaveBeenCalledTimes(1)
      })
    })

    describe('with willSendRequest', () => {
      beforeEach(() => {
        instance.willSendRequest = jest.fn().mockResolvedValue(undefined)
      })

      it('doesn\'t call willSendRequest', async () => {
        await instance.initialize(dataSourceConfig)
        expect(fetch).toHaveBeenCalledTimes(0)

        await expect(instance.query!.fieldA).resolves.toBe(1)

        expect(instance.willSendRequest).toHaveBeenCalledTimes(0)
        expect(fetch).toHaveBeenCalledTimes(0)
        expect(fieldA.resolve).toHaveBeenCalledTimes(1)
      })
    })
  })
})
