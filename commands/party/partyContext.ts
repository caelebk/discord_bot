// partyContextCache.ts

type PartyContext = {
  selectedRoles: string[];
  joinSet: Set<string>;
  proxyMap: Map<string, string>; // <proxiedUserId, proxyUserId>
};

const partyCache: Map<string, PartyContext> = new Map();

export function setPartyContext(authorId: string, context: PartyContext) {
  partyCache.set(authorId, context);
}

export function getPartyContext(authorId: string): PartyContext | undefined {
  return partyCache.get(authorId);
}

export function clearPartyContext(authorId: string) {
  partyCache.delete(authorId);
}
