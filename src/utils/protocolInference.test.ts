import { describe, it, expect } from 'vitest';
import { inferProtocol } from './protocolInference';

describe('inferProtocol', () => {
  it('service → service = REST', () => {
    expect(inferProtocol('service', 'service')).toBe('REST');
  });
  it('service → database = TCP', () => {
    expect(inferProtocol('service', 'database')).toBe('TCP');
  });
  it('service → queue = AMQP', () => {
    expect(inferProtocol('service', 'queue')).toBe('AMQP');
  });
  it('service → external = HTTPS', () => {
    expect(inferProtocol('service', 'external')).toBe('HTTPS');
  });
  it('queue → service = Kafka', () => {
    expect(inferProtocol('queue', 'service')).toBe('Kafka');
  });
  it('external → service = REST', () => {
    expect(inferProtocol('external', 'service')).toBe('REST');
  });
  it('database → service = TCP', () => {
    expect(inferProtocol('database', 'service')).toBe('TCP');
  });
  it('database → database = TCP', () => {
    expect(inferProtocol('database', 'database')).toBe('TCP');
  });
  it('queue → queue = AMQP', () => {
    expect(inferProtocol('queue', 'queue')).toBe('AMQP');
  });
  it('external → database = HTTPS', () => {
    expect(inferProtocol('external', 'database')).toBe('HTTPS');
  });
  it('external → queue = HTTPS', () => {
    expect(inferProtocol('external', 'queue')).toBe('HTTPS');
  });
  it('queue → external = AMQP', () => {
    expect(inferProtocol('queue', 'external')).toBe('AMQP');
  });
  it('database → queue = TCP', () => {
    expect(inferProtocol('database', 'queue')).toBe('TCP');
  });
  it('database → external = TCP', () => {
    expect(inferProtocol('database', 'external')).toBe('TCP');
  });
  it('queue → database = AMQP', () => {
    expect(inferProtocol('queue', 'database')).toBe('AMQP');
  });
  it('external → external = HTTPS', () => {
    expect(inferProtocol('external', 'external')).toBe('HTTPS');
  });
});
