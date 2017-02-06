# Schesign xml schema

Schesign allows you to build and host data designs. Data designs can be accessed through the API as a graph in JSON format. See [schesign-js-api](https://github.com/csenn/schesign-js-api) for more info on retrieving a graph.

This library converts this graph into an XML schema.

### Install
```
npm install schesign-js-xml-schema --save
```

## Examples
### Basic Usage

```
  import { generateFromClass } from 'schesign-js-xml-schema'

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
  <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="class5">
      <xs:complexType>
        <xs:sequence>
          <xs:element name="a" type="xs:string" minOccurs="0"/>
          <xs:element name="b" type="xs:boolean" minOccurs="0"/>
        </xs:sequence>
      </xs:complexType>
    </xs:element>
  </xs:schema>
  */

```
### Usage with schesign-js-api module

```
import { fetchGraph, util } from 'schesign-js-api'
import { generateFromClass } from 'schesign-js-json-schema'

const uid = util.createUid({
  ownerType: 'o',
  userOrOrg: 'examples',
  designName: 'example_online_store',
  versionLabel: '1.1.0',
  resourceType: 'class',
  classOrProperty: 'Product'
});

/*
  Creates the data design's uid with a convenience function
  https://www.schesign.com/o/examples/example_online_store/1.1.0/class/product
*/
console.log(uid);

var options = { uid: uid };

fetchGraph(options).then(json => {
  const schema = generateFromClass(json.graph, uid)
  console.log(schema)
}).catch(err => {
  console.log(err);
});
```