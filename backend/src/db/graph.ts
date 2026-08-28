import { Driver } from 'neo4j-driver';
import { mockData } from '../data/mock';

export async function seedPaymentGraph(driver: Driver): Promise<void> {
  const session = driver.session();
  try {
    for (const node of mockData.graphNodes) {
      await session.run(
        `MERGE (n:Entity {id: $id})
         SET n.type = $type,
             n.label = $label,
             n.riskScore = $riskScore,
             n.props = $props`,
        {
          id: node.id,
          type: node.type,
          label: node.label,
          riskScore: node.riskScore,
          props: JSON.stringify(node.data ?? {}),
        }
      );
    }

    for (const edge of mockData.graphEdges) {
      await session.run(
        `MATCH (a:Entity {id: $source}), (b:Entity {id: $target})
         MERGE (a)-[r:RELATES {id: $id}]->(b)
         SET r.kind = $kind`,
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: edge.label,
        }
      );
    }
  } finally {
    await session.close();
  }
}

export async function fetchPaymentGraph(driver: Driver): Promise<{
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
} | null> {
  const session = driver.session();
  try {
    const nodeResult = await session.run(
      `MATCH (n:Entity) RETURN n.id AS id, n.type AS type, n.label AS label, n.riskScore AS riskScore, n.props AS props`
    );
    const edgeResult = await session.run(
      `MATCH (a:Entity)-[r:RELATES]->(b:Entity)
       RETURN r.id AS id, a.id AS source, b.id AS target, r.kind AS kind`
    );

    if (!nodeResult.records.length) return null;

    const nodes = nodeResult.records.map((rec) => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(String(rec.get('props') || '{}'));
      } catch {
        data = {};
      }
      return {
        id: rec.get('id'),
        type: rec.get('type'),
        label: rec.get('label'),
        riskScore: rec.get('riskScore'),
        data,
      };
    });

    const edges = edgeResult.records.map((rec) => ({
      id: rec.get('id'),
      source: rec.get('source'),
      target: rec.get('target'),
      label: rec.get('kind'),
    }));

    return { nodes, edges };
  } catch {
    return null;
  } finally {
    await session.close();
  }
}
