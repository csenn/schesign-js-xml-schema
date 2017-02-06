import { isArray, isNumber, isEmpty } from 'lodash';
import xml2js from 'xml2js';
import * as utils from './utils';

const EMAIL_REGEX = '.+@.+';

function makeRestriction(xsType, value) {
  return { xsType, value };
}

function _simpleType(xsType, propertyName, ref, restrictions) {
  let elem;

  if (isArray(restrictions) && restrictions.length) {
    const restriction = restrictions.reduce((prev, next) => {
      const node = { '$': { value: next.value } };
      if (prev[next.xsType]) {
        prev[next.xsType].push(node);
      } else {
        prev[next.xsType] = [node];
      }
      return prev;
    }, { '$': { base: xsType } });

    elem = {
      '$': { name: propertyName },
      'xs:simpleType': [{
        'xs:restriction': [restriction],
      }],
    };
  } else {
    elem = {
      '$': { name: propertyName, type: xsType },
    };
  }
  if (!utils.isRequiredCardinality(ref.cardinality)) {
    elem.$.minOccurs = '0';
  }
  if (utils.isMultipleCardinality(ref.cardinality)) {
    elem.$.maxOccurs = 'unbounded';
  }
  return elem;
}

function _fromBooleanRange(propertyName, ref) {
  return _simpleType('xs:boolean', propertyName, ref);
}

function _fromStringRange(propertyName, range, ref) {
  let xsType;
  const restrictions = [];

  if (range.format === utils.TEXT_FORMAT_URL) {
    xsType = 'xs:anyURI';
  } else {
    xsType = 'xs:string';
  }

  if (range.format === utils.TEXT_FORMAT_EMAIL) {
    restrictions.push(makeRestriction('xs:pattern', EMAIL_REGEX));
  }
  if (range.regex) {
    restrictions.push(makeRestriction('xs:pattern', range.regex));
  }
  if (isNumber(range.minLength)) {
    restrictions.push(makeRestriction('xs:minLength', range.minLength));
  }
  if (isNumber(range.maxLength)) {
    restrictions.push(makeRestriction('xs:maxLength', range.maxLength));
  }
  return _simpleType(xsType, propertyName, ref, restrictions);
}

function _fromNumberRange(propertyName, range, ref) {
  let xsType;
  const restrictions = [];

  switch (range.format) {
    case utils.NUMBER_INT:
      xsType = 'xs:integer';
      break;
    case utils.NUMBER_INT_8:
      xsType = 'xs:byte';
      break;
    case utils.NUMBER_INT_16:
      xsType = 'xs:short';
      break;
    case utils.NUMBER_INT_32:
      xsType = 'xs:integer';
      break;
    case utils.NUMBER_INT_64:
      xsType = 'xs:long';
      break;
    case utils.NUMBER_FLOAT_32:
      xsType = 'xs:float';
      break;
    case utils.NUMBER_FLOAT_64:
      xsType = 'xs:double';
      break;
    default:
      xsType = 'xs:float';
  }

  if (isNumber(range.min)) {
    restrictions.push(makeRestriction('xs:minExclusive', range.min));
  }
  if (isNumber(range.max)) {
    restrictions.push(makeRestriction('xs:maxExclusive', range.max));
  }

  return _simpleType(xsType, propertyName, ref, restrictions);
}

function _fromDateRange(propertyName, range, ref) {
  let xsType;
  switch (range.format) {
    case utils.DATE_TIME:
      xsType = 'xs:time';
      break;
    case utils.DATE_SHORT:
      xsType = 'xs:date';
      break;
    case utils.DATE_DATETIME:
    default:
      xsType = 'xs:dateTime';
  }

  return _simpleType(xsType, propertyName, ref);
}

function _fromEnumRange(propertyName, range, ref) {
  const restrictions = range.values.map(value => {
    return makeRestriction('xs:enumeration', value);
  });

  return _simpleType('xs:string', propertyName, ref, restrictions);
}

function _addPropertiesToSchema(context, propertyRefs) {
  const elems = propertyRefs.map(propertyRef => {
    const property = context.propertyCache[propertyRef.ref];
    const { label, range } = property;
    return _getFromRange(context, label, range, propertyRef);
  });
  return { 'xs:element': elems };
}

function _fromLinkedClass(context, propertyName, range, propertyRef) {
  const { ref } = range;
  _addClass(context, ref);
  return _simpleType(context.classCache[ref].label, propertyName, propertyRef);
}

function _addComplexType(context, elemName, propertyRefs) {
  return {
    '$': { 'name': elemName },
    'xs:complexType': [
      {
        'xs:sequence': _addPropertiesToSchema(context, propertyRefs),
      },
    ],
  };
}

function _addClass(context, classId) {
  if (context.addedClasses[classId]) {
    return;
  }
  context.addedClasses[classId] = true;

  const selectedClass = context.classCache[classId];

  const classNode = _addComplexType(
    context,
    selectedClass.label,
    selectedClass.propertyRefs
  );
  context.xsSchema['xs:element'].unshift(classNode);
}

function _getFromRange(context, propertyName, range, ref) {
  switch (range.type) {
    case utils.BOOLEAN:
      return _fromBooleanRange(propertyName, ref);
    case utils.TEXT:
      return _fromStringRange(propertyName, range, ref);
    case utils.NUMBER:
      return _fromNumberRange(propertyName, range, ref);
    case utils.DATE:
      return _fromDateRange(propertyName, range, ref);
    case utils.ENUM:
      return _fromEnumRange(propertyName, range, ref);
    case utils.NESTED_OBJECT:
      return _addComplexType(context, propertyName, range.propertyRefs);
    case utils.LINKED_CLASS:
      return _fromLinkedClass(context, propertyName, range, ref);
    default:
      throw new Error(`Not expecting type: ${range.type}`);
  }
}

function existsInRefs(context, propertyRefs, parentRef) {
  return propertyRefs.some(ref => {
    const node = context.propertyCache[ref.ref];
    const parentNode = context.propertyCache[parentRef.ref];
    return node.label === parentNode.label;
  });
}

export function _flattenHierarchies(context) {
  Object.keys(context.classCache).forEach(key => {
    const classNode = context.classCache[key];
    const recurseNode = node => {
      if (node.subClassOf) {
        const parent = context.classCache[node.subClassOf];
        parent.propertyRefs.forEach(parentRef => {
          const exists = existsInRefs(context, classNode.propertyRefs, parentRef);
          if (!exists) {
            classNode.propertyRefs.push(parentRef);
          }
        });
        recurseNode(parent);
      }
    };
    recurseNode(classNode);
  });
}

const builder = new xml2js.Builder();

/* Main function */
// export function generateFromClass (classId, classes, properties) {

export function generateFromClass(graph, classId, options = {}) {
  const mainSchema = {
    'xs:schema': {
      '$': { 'xmlns:xs': 'http://www.w3.org/2001/XMLSchema' },
      'xs:element': [],
    },
  };

  const context = {
    /* Lookup to keep the nodes by uid */
    classCache: {},
    propertyCache: {},

    /* Main schema to build */
    xsSchema: mainSchema['xs:schema'],

    /* Track classes that are added to prevent duplicates */
    addedClasses: {},
  };

  /* Create a dict lookup for classes and properties for speed and convenience */
  graph.forEach(node => {
    if (node.type === 'Class') {
      context.classCache[node.uid] = node;
    } else if (node.type === 'Property') {
      context.propertyCache[node.uid] = node;
    }
  });

  _flattenHierarchies(context);

  _addClass(context, classId);
  return builder.buildObject(mainSchema);
}

