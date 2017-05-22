import fs from 'fs'
import path from 'path'
import { expect } from 'chai'
import { generateFromClass } from '../src'

import basic from 'schesign-graph-examples/graphs/export/basic'
import propertyVariations from 'schesign-graph-examples/graphs/export/property_variations'
import inheritanceChain2 from 'schesign-graph-examples/graphs/export/inheritance_chain_2'
import linkedNodes2 from 'schesign-graph-examples/graphs/export/linked_nodes_2'
import recursion from 'schesign-graph-examples/graphs/export/recursion'

const { describe, it } = global

const readSql = name => fs.readFileSync(path.resolve(__dirname, 'fixtures', name), 'utf-8')

describe('generateXmlSchema', () => {
  it('should convert basic to a json schema', () => {
    const schema = generateFromClass(
      basic.graph,
      'o/tests/basic/master/class/class_a'
    )
    expect(schema).to.deep.equal(readSql('basic_schema.xml'))
  })

  it('should convert recursion to an xml schema', () => {
    const schema = generateFromClass(
      recursion.graph,
      'o/tests/recursion/master/class/class1'
    )
    expect(schema).to.deep.equal(readSql('recursion_schema.xml'))
  })

  it('should convert propertyVariations to an xml schema', () => {
    const schema = generateFromClass(
      propertyVariations.graph,
      'o/tests/property_variations/master/class/class1'
    )
    expect(schema).to.deep.equal(readSql('property_variations_schema.xml'))
  })

  it('should convert inheritance to an xml schema', () => {
    const schema = generateFromClass(
      inheritanceChain2.graph,
      'o/tests/inheritance_chain_2/master/class/class5'
    )
    expect(schema).to.deep.equal(readSql('inheritance_schema.xml'))
  })

  it('should convert linkedNodes to an xml schema', () => {
    const schema = generateFromClass(
      linkedNodes2.graph,
      'o/tests/linked_nodes_2/master/class/class3'
    )
    expect(schema).to.deep.equal(readSql('linked_nodes_schema.xml'))
  })
})
