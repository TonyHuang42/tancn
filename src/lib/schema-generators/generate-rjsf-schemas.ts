import { flattenFormSteps } from "@/lib/form-elements-helpers";
import type {
	FormArray,
	FormElement,
	FormElementOrList,
	FormStep,
	Option,
} from "@/types/form-types";
import { isStatic } from "@/utils/utils";

/** @see https://github.com/rjsf-team/react-jsonschema-form — draft-07 is widely supported */
export const RJSF_JSON_SCHEMA_DRAFT =
	"http://json-schema.org/draft-07/schema#" as const;

export type RjsfUiSchema = Record<string, unknown>;

const isFormArray = (element: unknown): element is FormArray =>
	typeof element === "object" &&
	element !== null &&
	"fieldType" in element &&
	(element as FormArray).fieldType === "FormArray";

function fieldKey(name: string): string {
	return name.split(".").pop() || name;
}

function fieldTitle(el: FormElement | FormArray): string {
	if ("label" in el && el.label) return el.label;
	return fieldKey(el.name);
}

function optionEnums(options: Option[] | undefined): {
	enum: string[];
	enumNames: string[];
} {
	const list = options?.length ? options : [];
	return {
		enum: list.map((o) => o.value),
		enumNames: list.map((o) => o.label ?? o.value),
	};
}

type JsonProp = Record<string, unknown>;

function buildJsonProperty(
	element: FormElement,
): { key: string; prop: JsonProp; required: boolean } | null {
	if (isStatic(element.fieldType) || !element.name) return null;

	const key = fieldKey(element.name);
	const title = fieldTitle(element);
	const description =
		"description" in element && element.description
			? element.description
			: undefined;
	const required = "required" in element && element.required === true;

	const base = (): JsonProp => {
		const p: JsonProp = { title };
		if (description) p.description = description;
		return p;
	};

	let prop: JsonProp;

	switch (element.fieldType) {
		case "Input": {
			if (element.type === "email") {
				prop = { ...base(), type: "string", format: "email" };
				if (required) prop.minLength = 1;
			} else if (element.type === "number") {
				prop = { ...base(), type: "number" };
			} else {
				prop = { ...base(), type: "string" };
				if (required) prop.minLength = 1;
			}
			break;
		}
		case "Password": {
			prop = { ...base(), type: "string" };
			if (required) prop.minLength = 1;
			break;
		}
		case "Textarea": {
			prop = { ...base(), type: "string" };
			if (required) {
				prop.minLength = 10;
			}
			break;
		}
		case "OTP": {
			const len = element.maxLength ?? 6;
			prop = {
				...base(),
				type: "string",
				minLength: len,
				maxLength: len,
			};
			break;
		}
		case "DatePicker": {
			prop = { ...base(), type: "string", format: "date" };
			break;
		}
		case "Checkbox": {
			prop = { ...base(), type: "boolean" };
			// if (required) {
			// 	prop.const = true;
			// }
			break;
		}
		case "Switch": {
			prop = { ...base(), type: "boolean" };
			break;
		}
		case "Slider": {
			prop = {
				...base(),
				type: "integer",
				minimum: element.min ?? 1,
				maximum: element.max ?? 100,
			};
			break;
		}
		case "Select": {
			const { enum: en, enumNames } = optionEnums(element.options);
			prop = {
				...base(),
				type: "string",
				enum: en.length ? en : [""],
				...(enumNames.length ? { enumNames } : {}),
			};
			break;
		}
		case "RadioGroup": {
			const { enum: en, enumNames } = optionEnums(element.options);
			prop = {
				...base(),
				type: "string",
				enum: en.length ? en : [""],
				...(enumNames.length ? { enumNames } : {}),
			};
			break;
		}
		case "ToggleGroup": {
			const { enum: en, enumNames } = optionEnums(element.options);
			if (element.type === "single") {
				prop = {
					...base(),
					type: "string",
					enum: en.length ? en : [""],
					...(enumNames.length ? { enumNames } : {}),
				};
			} else {
				prop = {
					...base(),
					type: "array",
					items: {
						type: "string",
						enum: en.length ? en : [""],
						...(enumNames.length ? { enumNames } : {}),
					},
					uniqueItems: true,
				};
				if (required) prop.minItems = 1;
			}
			break;
		}
		case "MultiSelect": {
			const { enum: en, enumNames } = optionEnums(element.options);
			prop = {
				...base(),
				type: "array",
				items: {
					type: "string",
					enum: en.length ? en : [""],
					...(enumNames.length ? { enumNames } : {}),
				},
				uniqueItems: true,
			};
			if (required) prop.minItems = 1;
			break;
		}
		default:
			prop = { ...base(), type: "string" };
	}

	return { key, prop, required };
}

function buildUiEntry(
	element: FormElement,
): { key: string; ui: RjsfUiSchema } | null {
	if (isStatic(element.fieldType) || !element.name) return null;

	const key = fieldKey(element.name);
	const title = fieldTitle(element);
	const description =
		"description" in element && element.description
			? element.description
			: undefined;

	const ui: RjsfUiSchema = {};
	if (title) ui["ui:title"] = title;
	if (description) ui["ui:description"] = description;

	switch (element.fieldType) {
		case "Password":
			ui["ui:widget"] = "password";
			break;
		case "Textarea":
			ui["ui:widget"] = "textarea";
			if ("rows" in element && typeof element.rows === "number") {
				ui["ui:options"] = { rows: element.rows };
			}
			break;
		case "Input":
			if (element.type === "number") {
				ui["ui:widget"] = "updown";
			}
			if (element.placeholder) {
				ui["ui:placeholder"] = element.placeholder;
			}
			break;
		case "Select":
			ui["ui:widget"] = "select";
			if (element.placeholder) {
				ui["ui:placeholder"] = element.placeholder;
			}
			break;
		case "RadioGroup":
			ui["ui:widget"] = "radio";
			break;
		case "MultiSelect":
			ui["ui:widget"] = "select";
			ui["ui:options"] = { multiple: true };
			if (element.placeholder) {
				ui["ui:placeholder"] = element.placeholder;
			}
			break;
		case "ToggleGroup":
			ui["ui:widget"] = element.type === "single" ? "radio" : "checkboxes";
			break;
		case "Checkbox":
		case "Switch":
			ui["ui:widget"] = "checkbox";
			break;
		case "Slider":
			ui["ui:widget"] = "range";
			break;
		case "DatePicker":
			ui["ui:widget"] = "date";
			break;
		case "OTP":
			ui["ui:options"] = { inputType: "password" };
			break;
		default:
			break;
	}

	return Object.keys(ui).length ? { key, ui } : { key, ui: {} };
}

function getFlattenedFields(
	formElements: FormElementOrList[] | FormStep[],
	isMS: boolean,
): (FormElement | FormArray)[] {
	const flattenFormElements = isMS
		? flattenFormSteps(formElements as FormStep[]).flat()
		: ((formElements || []).flat() as FormElement[]);
	return flattenFormElements.filter((o) => o && !o.static) as (
		| FormElement
		| FormArray
	)[];
}

/** One level of row grouping, same as valibot generator */
function walkFormElementList(
	list: FormElementOrList[],
	callback: (el: FormElement) => void,
): void {
	for (const node of list) {
		if (Array.isArray(node)) {
			for (const x of node) {
				if (!isFormArray(x)) callback(x);
			}
		} else if (!isFormArray(node)) {
			callback(node);
		}
	}
}

/**
 * JSON Schema shaped for @rjsf/core (draft-07, title/description, enum/enumNames).
 * Value shape matches a flattened form (multi-step fields merged into one object).
 */
export function generateRjsfJsonSchema(
	formElements: FormElementOrList[] | FormStep[],
	isMS: boolean,
): Record<string, unknown> {
	const fields = getFlattenedFields(formElements, isMS);
	const properties: Record<string, JsonProp> = {};
	const required: string[] = [];

	const processElement = (element: FormElement | FormArray): void => {
		if (isFormArray(element)) {
			const arrKey = fieldKey(element.name);
			const innerList = (
				element.arrayField || []
			).flat() as FormElementOrList[];
			const itemProps: Record<string, JsonProp> = {};
			const itemRequired: string[] = [];

			walkFormElementList(innerList, (inner) => {
				const built = buildJsonProperty(inner);
				if (!built) return;
				itemProps[built.key] = built.prop;
				if (built.required) itemRequired.push(built.key);
			});

			const itemSchema: JsonProp = {
				type: "object",
				properties: itemProps,
				...(itemRequired.length ? { required: itemRequired } : {}),
				additionalProperties: false,
			};

			const arrProp: JsonProp = {
				title: fieldTitle(element),
				type: "array",
				items: itemSchema,
			};
			if ("description" in element && element.description) {
				arrProp.description = element.description;
			}
			if (!("required" in element) || element.required !== true) {
				// optional array — omit from root `required`
			} else {
				required.push(arrKey);
				arrProp.minItems = 1;
			}

			properties[arrKey] = arrProp;
			return;
		}

		const built = buildJsonProperty(element);
		if (!built) return;
		properties[built.key] = built.prop;
		if (built.required) required.push(built.key);
	};

	for (const el of fields) {
		if (Array.isArray(el)) {
			for (const sub of el) processElement(sub);
		} else {
			processElement(el);
		}
	}

	return {
		$schema: RJSF_JSON_SCHEMA_DRAFT,
		title: "Form",
		type: "object",
		properties,
		...(required.length ? { required } : {}),
		additionalProperties: false,
	};
}

/**
 * UiSchema for @rjsf/core / @rjsf/utils (widgets, titles, array item layout).
 */
export function generateFormUiSchema(
	formElements: FormElementOrList[] | FormStep[],
	isMS: boolean,
): RjsfUiSchema {
	const fields = getFlattenedFields(formElements, isMS);
	const uiRoot: RjsfUiSchema = {};
	const order: string[] = [];

	const mergeUi = (key: string, ui: RjsfUiSchema): void => {
		const existing = uiRoot[key];
		if (
			existing &&
			typeof existing === "object" &&
			!Array.isArray(existing) &&
			Object.keys(ui).length
		) {
			uiRoot[key] = { ...existing, ...ui };
		} else if (Object.keys(ui).length) {
			uiRoot[key] = ui;
		}
	};

	const processElement = (element: FormElement | FormArray): void => {
		if (isFormArray(element)) {
			const arrKey = fieldKey(element.name);
			order.push(arrKey);
			const innerList = (
				element.arrayField || []
			).flat() as FormElementOrList[];
			const itemsUi: RjsfUiSchema = {};
			const itemOrder: string[] = [];

			walkFormElementList(innerList, (inner) => {
				const entry = buildUiEntry(inner);
				if (!entry) return;
				itemOrder.push(entry.key);
				if (Object.keys(entry.ui).length) {
					itemsUi[entry.key] = entry.ui;
				}
			});

			const arrUi: RjsfUiSchema = {
				"ui:options": {
					addable: true,
					removable: true,
					orderable: false,
				},
			};
			if ("label" in element && element.label) {
				arrUi["ui:title"] = element.label;
			}
			if (Object.keys(itemsUi).length || itemOrder.length) {
				arrUi.items = {
					...itemsUi,
					...(itemOrder.length ? { "ui:order": itemOrder } : {}),
				};
			}
			uiRoot[arrKey] = arrUi;
			return;
		}

		const entry = buildUiEntry(element);
		if (!entry) return;
		order.push(entry.key);
		mergeUi(entry.key, entry.ui);
	};

	for (const el of fields) {
		if (Array.isArray(el)) {
			for (const sub of el) processElement(sub);
		} else {
			processElement(el);
		}
	}

	if (order.length) {
		uiRoot["ui:order"] = order;
	}

	return uiRoot;
}
