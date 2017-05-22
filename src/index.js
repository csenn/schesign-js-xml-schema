import isArray from 'lodash/isArray'
import isNumber from 'lodash/isNumber'
import xml2js from 'xml2js'
import * as utils from './utils'

const EMAIL_REGEX = '.+@.+'

function makeRestriction (xsType, value) {
  return { xsType, value }
}

function _simpleType (xsType, propertyName, spec, restrictions) {
  let elem

  if (isArray(restrictions) && restrictions.length) {
    const restriction = restrictions.reduce((prev, next) => {
      const node = { '$': { value: next.value } }
      if (prev[next.xsType]) {
        prev[next.xsType].push(node)
      } else {
        prev[next.xsType] = [node]
      }
      return prev
    }, { '$': { base: xsType } })

    elem = {
      '$': { name: propertyName },
      'xs:simpleType': [{
        'xs:restriction': [restriction]
      }]
    }
  } else {
    elem = {
      '$': { name: propertyName, type: xsType }
    }
  }
  if (!spec.required) {
    elem.$.minOccurs = '0'
  }
  if (spec.array) {
    if (isNumber(spec.minItems)) {
      elem.$.minOccurs = spec.minItems
    }
    if (isNumber(spec.maxItems)) {
      elem.$.maxOccurs = spec.maxItems
    } else {
      elem.$.maxOccurs = 'unbounded'
    }
  }
  return elem
}

function _fromBooleanRange (propertyName, ref) {
  return _simpleType('xs:boolean', propertyName, ref)
}

function _fromStringRange (propertyName, range, ref) {
  let xsType
  const restrictions = []

  if (range.format === utils.TEXT_FORMAT_URL) {
    xsType = 'xs:anyURI'
  } else {
    xsType = 'xs:string'
  }

  if (range.format === utils.TEXT_FORMAT_EMAIL) {
    restrictions.push(makeRestriction('xs:pattern', EMAIL_REGEX))
  }
  if (range.regex) {
    restrictions.push(makeRestriction('xs:pattern', range.regex))
  }
  if (isNumber(range.minLength)) {
    restrictions.push(makeRestriction('xs:minLength', range.minLength))
  }
  if (isNumber(range.maxLength)) {
    restrictions.push(makeRestriction('xs:maxLength', range.maxLength))
  }
  return _simpleType(xsType, propertyName, ref, restrictions)
}

function _fromNumberRange (propertyName, range, ref) {
  let xsType
  const restrictions = []

  switch (range.format) {
    case utils.NUMBER_INT:
      xsType = 'xs:integer'
      break
    case utils.NUMBER_INT_8:
      xsType = 'xs:byte'
      break
    case utils.NUMBER_INT_16:
      xsType = 'xs:short'
      break
    case utils.NUMBER_INT_32:
      xsType = 'xs:integer'
      break
    case utils.NUMBER_INT_64:
      xsType = 'xs:long'
      break
    case utils.NUMBER_FLOAT_32:
      xsType = 'xs:float'
      break
    case utils.NUMBER_FLOAT_64:
      xsType = 'xs:double'
      break
    default:
      xsType = 'xs:float'
  }

  if (isNumber(range.min)) {
    restrictions.push(makeRestriction('xs:minExclusive', range.min))
  }
  if (isNumber(range.max)) {
    restrictions.push(makeRestriction('xs:maxExclusive', range.max))
  }

  return _simpleType(xsType, propertyName, ref, restrictions)
}

function _fromDateRange (propertyName, range, ref) {
  let xsType
  switch (range.format) {
    case utils.DATE_TIME:
      xsType = 'xs:time'
      break
    case utils.DATE_SHORT:
      xsType = 'xs:date'
      break
    case utils.DATE_DATETIME:
    default:
      xsType = 'xs:dateTime'
  }

  return _simpleType(xsType, propertyName, ref)
}

function _fromEnumRange (propertyName, range, ref) {
  const restrictions = range.values.map(value => {
    return makeRestriction('xs:enumeration', value)
  })

  return _simpleType('xs:string', propertyName, ref, restrictions)
}

function _addPropertiesToSchema (context, propertySpecs) {
  const elems = propertySpecs.map(propertySpec => {
    const property = context.propertyCache[propertySpec.ref]
    return _getFromRange(context, property, propertySpec)
  })
  return { 'xs:element': elems }
}

function _fromLinkedClass (context, propertyName, range, propertySpec) {
  const { ref } = range
  _addClass(context, ref)
  return _simpleType(ref, propertyName, propertySpec)
}

function _fromNestedObject (context, property, spec) {
  _addComplexType(context, property.uid, property.range.propertySpecs)
  return _simpleType(property.uid, property.label, spec)
}

function _addComplexType (context, uid, propertySpecs) {
  if (context.complexTypesAdded[uid]) {
    return
  }
  context.complexTypesAdded[uid] = true

  const schema = {
    '$': { 'name': uid },
    'xs:sequence': _addPropertiesToSchema(context, propertySpecs)
  }

  context.xsSchema['xs:complexType'].unshift(schema)

  return schema
}

function _addClass (context, classId) {
  const selectedClass = context.classCache[classId]
  if (!selectedClass) {
    throw new Error(`Class ${classId} could not be found in graph`)
  }
  _addComplexType(
    context,
    selectedClass.uid,
    selectedClass.propertySpecs
  )
}

function _getFromRange (context, property, ref) {
  const { label, range } = property

  switch (range.type) {
    case utils.BOOLEAN:
      return _fromBooleanRange(label, ref)
    case utils.TEXT:
      return _fromStringRange(label, range, ref)
    case utils.NUMBER:
      return _fromNumberRange(label, range, ref)
    case utils.DATE:
      return _fromDateRange(label, range, ref)
    case utils.ENUM:
      return _fromEnumRange(label, range, ref)
    case utils.NESTED_OBJECT:
      return _fromNestedObject(context, property, ref)
    case utils.LINKED_CLASS:
      return _fromLinkedClass(context, label, range, ref)
    default:
      throw new Error(`Not expecting type: ${range.type}`)
  }
}

/* If there is a property label lower in the hierarchy,
do not overwrite it from parent with same name */
function existsInRefs (context, propertySpecs, parentRef) {
  return propertySpecs.some(ref => {
    const node = context.propertyCache[ref.ref]
    const parentNode = context.propertyCache[parentRef.ref]
    return node.label === parentNode.label
  })
}

export function _flattenHierarchies (context) {
  Object.keys(context.classCache).forEach(key => {
    const classNode = context.classCache[key]
    const excluded = []

    const recurseNode = node => {
      if (node.subClassOf) {
        const parent = context.classCache[node.subClassOf]
        parent.propertySpecs.forEach(parentRef => {
          if (node.excludeParentProperties) {
            excluded.push(...node.excludeParentProperties)
          }
          const exists = existsInRefs(context, classNode.propertySpecs, parentRef)
          if (!exists) {
            classNode.propertySpecs.push(parentRef)
          }
        })
        recurseNode(parent)
      }
    }

    recurseNode(classNode)
    classNode.propertySpecs = classNode.propertySpecs.filter(spec => excluded.indexOf(spec.ref) === -1)
  })
}

const builder = new xml2js.Builder()

/* Main function */
export function generateFromClass (graph, classId, options = {}) {
  const context = {
    /* Lookup to keep the nodes by uid */
    classCache: {},
    propertyCache: {},

    /* Track complexTypes added to prevent duplicates */
    complexTypesAdded: {}
  }

  /* Create a dict lookup for classes and properties for speed and convenience */
  graph.forEach(node => {
    if (node.type === 'Class') {
      context.classCache[node.uid] = node
    } else if (node.type === 'Property') {
      context.propertyCache[node.uid] = node
    }
  })

  const currClass = context.classCache[classId]
  if (!currClass) {
    throw new Error(`Could not find class: ${classId} in graph`)
  }

  const mainSchema = {
    'xs:schema': {
      '$': { 'xmlns:xs': 'http://www.w3.org/2001/XMLSchema' },
      'xs:element': {
        '$': {
          name: currClass.label,
          type: classId
        }
      },
      'xs:complexType': []
    }
  }

  context.xsSchema = mainSchema['xs:schema']

  _flattenHierarchies(context)
  _addClass(context, classId)

  return builder.buildObject(mainSchema)
}
