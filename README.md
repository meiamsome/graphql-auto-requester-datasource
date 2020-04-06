# graphql-auto-requester-datasource

This module provides the graphql-auto-requester as an [Apollo
DataSource](https://www.apollographql.com/docs/apollo-server/data/data-sources/).

## Creating a DataSource
There are a few ways to create the DataSource from this library:

###  Using Introspection

If you wish to use introspection, you can just set the `baseURL` for your service in the constructor:
```js
class IntrospectedGraphQLService extends GraphQLAutoRequesterDataSource {
  constructor() {
    this.baseURL = 'https://example.com/'
  }
}
```

###  Using A Schema Document

If you wish to use a Schema Document, you must set the `baseURL` for your service in the constructor, and provide the
schema document as a property on the class itself.
```js
class SchemaDocumentGraphQLService extends GraphQLAutoRequesterDataSource {
  constructor() {
    this.baseURL = 'https://example.com/'
  }
}

SchemaDocumentGraphQLService.schemaDocument = `
  type Query {
    example: Int!
  }
`
```

###  Using An executable Schema

If you wish to use an executable Schema, you can set the `executableSchema` property in the constructor
```js
class ExecutableSchemaGraphQLService extends GraphQLAutoRequesterDataSource {
  constructor() {
    this.executableSchema = myExecutableSchema
  }
}
```

## Usage as a DataSource:

Once you have your dataSource configured in your Apollo Server initialization, you can then access the `.query` field
from the dataSources key in your resolvers to start a query against the upstream service. For more information on the
usage of the `graphql-auto-requester` see [its
documentation](https://github.com/meiamsome/graphql-auto-requester/blob/master/Readme.md)
```js
const resolvers = {
  Query: {
    anExample: (_, _, { dataSources }) => {
      // Resolves the Query.example field on the upstream service
      return dataSources.schemaDocumentGraphQLService.query.example
    }
  }
}
```
