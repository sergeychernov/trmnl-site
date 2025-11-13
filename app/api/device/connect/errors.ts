export type DeviceConnectErrorCode =
	| "unauthorized"
	| "invalid_or_missing_pin"
	| "device_not_found_or_already_registered"
	| "internal_error"
	| "unknown_error";

export const DeviceConnectErrorMessages: Record<DeviceConnectErrorCode, string> = {
	unauthorized: "Необходима авторизация",
	invalid_or_missing_pin: "Некорректный PIN",
	device_not_found_or_already_registered: "Устройство не найдено или уже зарегистрировано",
	internal_error: "Внутренняя ошибка сервера",
	unknown_error: "Ошибка при привязке устройства",
};


