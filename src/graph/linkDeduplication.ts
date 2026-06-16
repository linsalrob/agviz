import type { AssemblyEdge } from './graphTypes';

export type Orientation = '+' | '-';

export interface LinkKeyInput {
  from: string;
  fromOrient: Orientation;
  to: string;
  toOrient: Orientation;
  overlap?: string;
}

export interface DeduplicatedLink {
  canonicalKey: string;
  representative: AssemblyEdge;
  members: AssemblyEdge[];
}

export function flipOrient(orient: Orientation): Orientation {
  return orient === '+' ? '-' : '+';
}

export function canonicalGfaLinkKey(link: LinkKeyInput): string {
  const overlap = link.overlap ?? '';
  const forward = `${link.from}${link.fromOrient}|${link.to}${link.toOrient}|${overlap}`;
  const reciprocal = `${link.to}${flipOrient(link.toOrient)}|${link.from}${flipOrient(link.fromOrient)}|${overlap}`;
  return forward < reciprocal ? forward : reciprocal;
}

function edgeSignature(
  source: string,
  sourceOrient: string | undefined,
  target: string,
  targetOrient: string | undefined,
  overlap: string | undefined,
): string {
  return `${source}${sourceOrient ?? '?'}|${target}${targetOrient ?? '?'}|${overlap ?? ''}`;
}

function reciprocalEdgeSignature(edge: AssemblyEdge): string | null {
  if (!edge.sourceOrient || !edge.targetOrient) {
    return null;
  }

  return edgeSignature(
    edge.target,
    flipOrient(edge.targetOrient),
    edge.source,
    flipOrient(edge.sourceOrient),
    edge.overlap,
  );
}

export function deduplicateReciprocalLinks(edges: AssemblyEdge[]): DeduplicatedLink[] {
  const output: DeduplicatedLink[] = [];
  const byKey = new Map<string, AssemblyEdge[]>();

  for (const edge of edges) {
    if (!edge.sourceOrient || !edge.targetOrient) {
      const fallbackKey = `${edgeSignature(edge.source, edge.sourceOrient, edge.target, edge.targetOrient, edge.overlap)}|${edge.id}`;
      output.push({
        canonicalKey: fallbackKey,
        representative: edge,
        members: [edge],
      });
      continue;
    }

    const key = canonicalGfaLinkKey({
      from: edge.source,
      fromOrient: edge.sourceOrient,
      to: edge.target,
      toOrient: edge.targetOrient,
      overlap: edge.overlap,
    });
    const bucket = byKey.get(key) ?? [];
    bucket.push(edge);
    byKey.set(key, bucket);
  }

  for (const [canonicalKey, members] of byKey.entries()) {
    const signatureMap = new Map<string, AssemblyEdge[]>();

    for (const edge of members) {
      const signature = edgeSignature(
        edge.source,
        edge.sourceOrient,
        edge.target,
        edge.targetOrient,
        edge.overlap,
      );
      const list = signatureMap.get(signature) ?? [];
      list.push(edge);
      signatureMap.set(signature, list);
    }

    const shouldCollapse = members.some((edge) => {
      const ownSignature = edgeSignature(
        edge.source,
        edge.sourceOrient,
        edge.target,
        edge.targetOrient,
        edge.overlap,
      );
      const reciprocalSignature = reciprocalEdgeSignature(edge);
      if (!reciprocalSignature) {
        return false;
      }
      return reciprocalSignature === ownSignature || signatureMap.has(reciprocalSignature);
    });

    if (shouldCollapse) {
      output.push({
        canonicalKey,
        representative: members[0],
        members,
      });
      continue;
    }

    for (const edge of members) {
      output.push({
        canonicalKey: `${canonicalKey}|${edge.id}`,
        representative: edge,
        members: [edge],
      });
    }
  }

  return output;
}
