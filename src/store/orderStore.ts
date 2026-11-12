'use client';
import { create } from 'zustand';
import type { OrderState, OrderTransition as Transition } from '../game/order';
interface Store { order: OrderState | null; start: (order: OrderState) => void; apply: (transition: Transition) => void }
export const useOrderStore = create<Store>(set => ({order: null,start: order=>set({order}),apply: transition=>set({order:transition.state})}));
