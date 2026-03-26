import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import * as z from "zod";
import useFormBuilderState from "@/hooks/use-form-builder-state";
import {
	generateFormJsonSchema,
	generateFormUiSchema,
} from "@/lib/schema-generators";
import {
	saveFormTemplateWithCommand,
	setFormName,
	setGeneratedCommandUrl,
} from "@/services/form-builder.service";

import type { CreateRegistryResponse } from "@/types/form-types";
import { logger } from "@/utils/utils";
import { AnimatedIconButton } from "../ui/animated-icon-button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "../ui/input-group";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "../ui/revola";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { revalidateLogic, useAppForm } from "../ui/tanstack-form";
import { TerminalIcon } from "../ui/terminal";
import { GeneratedFormCodeViewer } from "./form-code-viewer";

const formSchema = z.object({
	formName: z.string().min(1, { message: "Form name is required" }),
});
function CodeDialog() {
	const { formName, formElements, isMS, generatedCommandUrl } =
		useFormBuilderState();
	const [open, setOpen] = useState(false);
	// Initialize with existing command if available
	const [isGenerateSuccess, setIsGenerateSuccess] = useState(
		!!generatedCommandUrl,
	);
	const id = useId();
	const rjsfBundle = {
		jsonSchema: generateFormJsonSchema(formElements, isMS),
		uiSchema: generateFormUiSchema(formElements, isMS),
	};
	const jsonSchemaContent = JSON.stringify(rjsfBundle, null, 2);
	const files = [
		{
			path: `schemas/${formName}.json`,
			content: jsonSchemaContent,
			type: "registry:lib",
			target: "",
		},
	];
	const payload = {
		registryDependencies: [] as string[],
		dependencies: [] as string[],
		files,
		name: formName,
	};

	const mutation = useMutation<CreateRegistryResponse, Error, void>({
		mutationKey: ["/create-command", formName],
		mutationFn: async (): Promise<CreateRegistryResponse> => {
			const res = await fetch(`/r/${formName}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});
			const data: CreateRegistryResponse = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			return data;
		},
	});

	const form = useAppForm({
		defaultValues: {
			formName: formName,
		} as z.input<typeof formSchema>,
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: formSchema,
			onDynamicAsyncDebounceMs: 300,
		},
		onSubmit: async () => {
			try {
				const result = await mutation.mutateAsync();
				logger("Response:", result);
				if (result.data?.id) {
					setIsGenerateSuccess(true);
					// Update command URL in active form builder state
					setGeneratedCommandUrl(result.data.id);
					// Auto-save/update template with generated command URL
					saveFormTemplateWithCommand(formName, result.data.id);
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "An error occurred";
				form.setErrorMap({
					onDynamic: {
						fields: {
							formName: {
								message,
							},
						},
					},
				});
			}
		},
		onSubmitInvalid({ formApi }) {
			const errorMap = formApi.state.errorMap.onDynamic;
			if (!errorMap) return;

			const inputs = Array.from(
				document.querySelectorAll(`#${id} input`),
			) as HTMLInputElement[];
			let firstInput: HTMLInputElement | undefined;
			for (const input of inputs) {
				if (errorMap[input.name]) {
					firstInput = input;
					break;
				}
			}
			firstInput?.focus();
		},
		listeners: {
			onChangeDebounceMs: 300,
			onChange: ({ fieldApi }) => {
				logger(fieldApi.state.value);
				fieldApi.state.value = fieldApi.state.value
					.replace(/[^a-zA-Z0-9\s_]/g, "")
					.split(/[\s_]+/)
					.filter(Boolean)
					.map(
						(word: string) =>
							word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
					)
					.join("");
				setFormName(fieldApi.state.value as string);
			},
		},
	});
	// Sync state when generatedCommandUrl changes (e.g., loading a template)
	useEffect(() => {
		if (generatedCommandUrl) {
			setIsGenerateSuccess(true);
		} else {
			setIsGenerateSuccess(false);
		}
	}, [generatedCommandUrl]);

	// Sync form field value when formName changes (e.g., loading a template)
	useEffect(() => {
		if (formName && form.state.values.formName !== formName) {
			form.setFieldValue("formName", formName);
		}
	}, [formName, form]);
	return (
		<ResponsiveDialog open={open} onOpenChange={setOpen}>
			<ResponsiveDialogTrigger asChild>
				<AnimatedIconButton
					icon={<TerminalIcon className="w-4 h-4 mr-1" />}
					text={<span className="hidden xl:block ml-1">Code</span>}
					variant={"ghost"}
					size="sm"
				/>
			</ResponsiveDialogTrigger>
			<ResponsiveDialogContent className="max-w-6xl lg:max-w-4xl max-h-[85vh] p-0">
				<div className="flex flex-col h-full max-h-[85vh]">
					<ResponsiveDialogHeader className="p-6 pb-4 border-b">
						<ResponsiveDialogTitle>JSON Schema export</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Copy the schema or save a share link to fetch it later
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>
					<form.AppForm>
						<form.Form id={id} className="px-6 pt-4">
							<form.AppField name={"formName"}>
								{(field) => (
									<field.FieldSet className="w-full">
										<field.Field
											aria-invalid={
												!!field.state.meta.errors.length &&
												field.state.meta.isTouched
											}
										>
											<field.FieldLabel htmlFor={"formName"}>
												Form Name
											</field.FieldLabel>
											<InputGroup>
												<InputGroupInput
													name={"formName"}
													aria-invalid={
														!!field.state.meta.errors.length &&
														field.state.meta.isTouched
													}
													placeholder="Enter your form name eg:- ContactUs"
													type="string"
													value={field.state.value as string}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													disabled={isGenerateSuccess}
												/>
												<InputGroupAddon align="inline-end">
													{mutation.isPending ? (
														<InputGroupButton
															variant="secondary"
															type="button"
															disabled
														>
															<Spinner className="w-4 h-4 mr-2" />
															Generating...
														</InputGroupButton>
													) : (
														<InputGroupButton
															variant="secondary"
															type="submit"
															disabled={
																form.state.isSubmitting || isGenerateSuccess
															}
														>
															Save share link
														</InputGroupButton>
													)}
												</InputGroupAddon>
											</InputGroup>
										</field.Field>
										<field.FieldError />
									</field.FieldSet>
								)}
							</form.AppField>
						</form.Form>
					</form.AppForm>
					<Separator className="my-4" />
					<ScrollArea className="flex-1 px-6 py-4">
						<GeneratedFormCodeViewer />
					</ScrollArea>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

export default CodeDialog;
