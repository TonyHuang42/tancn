import { describe, expect, it } from "vitest";
import type { FormElement } from "@/types/form-types";
import {
	generateFormJsonSchema,
	generateFormUiSchema,
} from "@/lib/schema-generators/generate-form-json-schema";
import { RJSF_JSON_SCHEMA_DRAFT } from "@/lib/schema-generators/generate-rjsf-schemas";

describe("generateFormJsonSchema (RJSF)", () => {
	it("uses draft-07 and object root for RJSF compatibility", () => {
		const elements: FormElement[] = [
			{
				id: "f1",
				name: "userEmail",
				fieldType: "Input",
				type: "email",
				label: "Email",
				required: true,
			} as FormElement,
		];

		const schema = generateFormJsonSchema(elements, false) as {
			$schema?: string;
			type?: string;
			properties?: Record<string, unknown>;
			required?: string[];
			additionalProperties?: boolean;
		};

		expect(schema.$schema).toBe(RJSF_JSON_SCHEMA_DRAFT);
		expect(schema.type).toBe("object");
		expect(schema.additionalProperties).toBe(false);
		expect(schema.properties?.userEmail).toMatchObject({
			type: "string",
			format: "email",
			title: "Email",
		});
		expect(schema.required).toContain("userEmail");
	});

	it("omits optional fields from required array", () => {
		const elements: FormElement[] = [
			{
				id: "f1",
				name: "nickname",
				fieldType: "Input",
				label: "Nickname",
				required: false,
			} as FormElement,
		];

		const schema = generateFormJsonSchema(elements, false) as {
			properties?: Record<string, unknown>;
			required?: string[];
		};

		expect(schema.properties?.nickname).toBeDefined();
		expect(schema.required ?? []).not.toContain("nickname");
	});

	it("adds enum and enumNames for Select (RJSF labels)", () => {
		const elements: FormElement[] = [
			{
				id: "f1",
				name: "country",
				fieldType: "Select",
				label: "Country",
				placeholder: "Pick one",
				required: true,
				options: [
					{ value: "us", label: "United States" },
					{ value: "ca", label: "Canada" },
				],
			} as FormElement,
		];

		const schema = generateFormJsonSchema(elements, false) as {
			properties?: Record<string, { enum?: string[]; enumNames?: string[] }>;
		};

		expect(schema.properties?.country?.enum).toEqual(["us", "ca"]);
		expect(schema.properties?.country?.enumNames).toEqual([
			"United States",
			"Canada",
		]);
	});
});

describe("generateFormUiSchema", () => {
	it("sets ui:order and widgets for common fields", () => {
		const elements: FormElement[] = [
			{
				id: "f1",
				name: "bio",
				fieldType: "Textarea",
				label: "Bio",
				required: false,
			} as FormElement,
			{
				id: "f2",
				name: "secret",
				fieldType: "Password",
				label: "Password",
				required: true,
			} as FormElement,
		];

		const ui = generateFormUiSchema(elements, false) as Record<
			string,
			unknown
		>;

		expect(ui["ui:order"]).toEqual(["bio", "secret"]);
		expect((ui.bio as Record<string, string>)["ui:widget"]).toBe("textarea");
		expect((ui.secret as Record<string, string>)["ui:widget"]).toBe(
			"password",
		);
	});
});
