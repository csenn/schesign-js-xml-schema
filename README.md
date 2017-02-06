## Intro

Schesign allows you to build and host data designs. Data designs can be accessed through the API as a graph in JSON format. This library converts this graph into JSON schema.


#### Note
Data designs are versioned which provides a convenient way to share schemas using the api and ensure a json blob is conforming to a desired spec. Retrieving /u/my_user/my_design/1.0.0/class/my_class will always return
the same graph, which in turn will always generate the same json schema. This makes sharing a versioned spec internally or with external partners straightforward.


npm install schesign-js-json-schema


### Usage

  import { generateFromClass } from 'schesign-js-json-schema'

  const graph = [
    {
      uid: 'https://www.schesign.com/u/my_user/my_design/0.0.1/class/class1',
      type: 'Class',
      label: 'Class1',
      propertyRefs: [
        {
          ref: 'https://www.schesign.com/u/my_user/my_design/0.0.1/property/a',
          cardinality: { minItems: 0, maxItems: 1 }
        },
        {
          ref: 'https://www.schesign.com/u/my_user/my_design/0.0.1/property/b',
          cardinality: { minItems: 1, maxItems: 1 }
        },
      ]
    },
    {
      uid: 'https://www.schesign.com/u/my_user/my_design/0.0.1/property/a',
      type: 'Property',
      label: 'a',
      range: {
        type: 'Text'
      }
    },
    {
      uid: 'https://www.schesign.com/u/my_user/my_design/0.0.1/property/b',
      type: 'Property',
      label: 'b',
      range: {
        type: 'Boolean'
      }
    }
  ]

  const schema = generateFromClass(
    graph,
    'https://www.schesign.com/u/my_user/my_design/0.0.1/class/class1'
  )

  console.log(schema)
  /*
    {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "properties": {
          "a": {  "type": "string" },
          "b": { "type": "boolean"}
        },
        "required": ["b"],
        "type": "object"
    }
  */

### Usage with schesign-api module


