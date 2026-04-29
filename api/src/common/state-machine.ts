import { BusinessLogicError } from './errors';

export type TransitionMap<S extends string> = Partial<Record<S, S[]>>;

export function canTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from]?.includes(to) ?? false;
}

export function assertTransition<S extends string>(
  map: TransitionMap<S>,
  from: S,
  to: S,
  entityName = 'entity',
): void {
  if (!canTransition(map, from, to)) {
    throw new BusinessLogicError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition ${entityName} from '${from}' to '${to}'`,
    );
  }
}
