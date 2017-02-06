import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import { generateFromClass } from '../src';
const { describe, it } = global;

// import simple from './fixtures/simple.json'
import propertyVariations from './fixtures/propertyVariations.json';
import linkedClasses from './fixtures/linkedClasses.json';
import inheritance from './fixtures/inheritance.json';

const readSql = name => fs.readFileSync(path.resolve(__dirname, 'fixtures', name), 'utf-8');
const propertyVariationsXml = readSql('propertyVariationsSchema.xml');
const linkedClassesXml = readSql('linkedClassesSchema.xml');
const inheritanceXml = readSql('inheritanceSchema.xml');
// const multipleCardinalitySql = readSql('multipleCardinalitySql.txt');

describe('generateJsonSchema', () => {
  // it('should convert simple to a json schema', () => {
  //   const schema = generateFromClass(
  //     simple.graph,
  //     'https://www.schesign.com/u/my_user/my_design/0.0.1/class/class1'
  //   );
  //   expect(schema).to.deep.equal(simpleSchema);
  // });

  it('should convert propertyVariations to an xml schema', () => {
    const schema = generateFromClass(
      propertyVariations.graph,
      'https://www.schesign.com/o/tests/test_property_variations/master/class/class1'
    );
    expect(schema).to.deep.equal(propertyVariationsXml);
  });

  it('should convert linkedClasses to an xml schema', () => {
    const schema = generateFromClass(
      linkedClasses.graph,
      'https://www.schesign.com/u/csenn/test_linking_2/master/class/class3'
    );
    expect(schema).to.deep.equal(linkedClassesXml);
  });

  it('should convert inheritance to an xml schema', () => {
    const schema = generateFromClass(
      inheritance.graph,
      'https://www.schesign.com/u/csenn/test_inheritance_2/master/class/class5'
    );
    console.log(schema);
    expect(schema).to.deep.equal(inheritanceXml);
  });
});
