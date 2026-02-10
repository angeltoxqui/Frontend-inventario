import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiRequestOptions } from './ApiRequestOptions';

type Headers = Record<string, string>;
type Middleware<T> = (value: T) => T | Promise<T>;
type Resolver<T> = (options: ApiRequestOptions<T>) => Promise<T>;

export class Interceptors<T> {
	_fns: Middleware<T>[];

	constructor() {
		this._fns = [];
	}

	eject(fn: Middleware<T>): void {
		const index = this._fns.indexOf(fn);
		if (index !== -1) {
			this._fns = [...this._fns.slice(0, index), ...this._fns.slice(index + 1)];
		}
	}

	use(fn: Middleware<T>): void {
		this._fns = [...this._fns, fn];
	}
}

export type OpenAPIConfig = {
	BASE: string;
	CREDENTIALS: 'include' | 'omit' | 'same-origin';
	ENCODE_PATH?: ((path: string) => string) | undefined;
	HEADERS?: Headers | Resolver<Headers> | undefined;
	PASSWORD?: string | Resolver<string> | undefined;
	TOKEN?: string | Resolver<string> | undefined;
	USERNAME?: string | Resolver<string> | undefined;
	VERSION: string;
	WITH_CREDENTIALS: boolean;
	interceptors: {
		request: Interceptors<AxiosRequestConfig>;
		response: Interceptors<AxiosResponse>;
	};
};

import { useAuthStore } from '../../hooks/useAuth';

export const OpenAPI: OpenAPIConfig = {
	// 1. Conexión dinámica al Backend
	BASE: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',

	// 2. Configuración de Seguridad
	VERSION: '1.0',
	WITH_CREDENTIALS: true, // Importante
	CREDENTIALS: 'include',

	// 3. ¡El Truco Senior! Inyección dinámica del Token
	// Esto hace que todas las peticiones generadas usen el token de tu estado
	TOKEN: async () => {
		const token = useAuthStore.getState().token;
		return token || '';
	},

	// Inicialización de interceptores (Déjalo como estaba)
	interceptors: {
		request: new Interceptors(),
		response: new Interceptors(),
	},
};