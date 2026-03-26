import { useEffect, useMemo } from "react";
import {
	CodeBlock,
	CodeBlockCode,
	CodeBlockGroup,
} from "@/components/ui/code-block";
import CopyButton from "@/components/ui/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	FormElementOrList,
	FormStep,
} from "@/db-collections/form-builder.collections";
import useFormBuilderState from "@/hooks/use-form-builder-state";
import useSettings from "@/hooks/use-settings";
import {
	generateFormJsonSchema,
	generateFormUiSchema,
	generateValidationCode,
} from "@/lib/schema-generators";
import {
	setPreferredFramework,
	setPreferredSchema,
} from "@/services/form-builder.service";
import { formatCode, logger } from "@/utils/utils";
import { AnimatedIconButton } from "../ui/animated-icon-button";
import { ChevronDownIcon } from "../ui/chevron-down";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const Wrapper = ({
	children,
	language,
	title,
}: {
	language: string;
	children: string;
	title: string;
}) => {
	return (
		<CodeBlock className="my-0 w-full border-border border rounded-md overflow-hidden bg-background dark:bg-background/95">
			<CodeBlockGroup className="border-border border-b px-4 py-2 bg-muted/50 dark:bg-muted/20">
				<div className="bg-muted dark:bg-muted/80 py-1 px-1.5 rounded-sm text-muted-foreground dark:text-muted-foreground/90 text-sm font-medium">
					{title}
				</div>
				<CopyButton text={children} />
			</CodeBlockGroup>
			<div className="*:mt-0 [&_pre]:p-3 w-full bg-background dark:bg-background/95">
				<CodeBlockCode code={children} language={language} copyButton={false} />
			</div>
		</CodeBlock>
	);
};

export const JsonViewer = ({
	json,
}: {
	json: FormElementOrList[] | FormStep[] | Record<string, unknown>;
}) => {
	let data: FormElementOrList[] | FormStep[] | Record<string, unknown> = json;
	if (!Array.isArray(data)) {
		data = [data] as FormStep[];
	}

	return (
		<Wrapper title="Form JSON" language="json">
			{JSON.stringify(data, null, 2)}
		</Wrapper>
	);
};

const CodeBlockJsonSchema = () => {
	const { formElements, isMS } = useFormBuilderState();

	useEffect(() => {
		logger("Form elements changed, regenerating JSON Schema:", formElements);
	}, [formElements]);

	const schemaJson = useMemo(
		() =>
			JSON.stringify(
				generateFormJsonSchema(formElements as FormElementOrList[], isMS),
				null,
				2,
			),
		[formElements, isMS],
	);

	const uiSchemaJson = useMemo(
		() =>
			JSON.stringify(
				generateFormUiSchema(formElements as FormElementOrList[], isMS),
				null,
				2,
			),
		[formElements, isMS],
	);

	return (
		<div className="relative max-w-full flex flex-col gap-y-5">
			<Wrapper title="form.schema.json (react-jsonschema-form)" language="json">
				{schemaJson}
			</Wrapper>
			<Wrapper title="form.uiSchema.json (@rjsf)" language="json">
				{uiSchemaJson}
			</Wrapper>
		</div>
	);
};

const CodeBlockSchema = () => {
	const { formName, formElements, isMS } = useFormBuilderState();
	const settings = useSettings();
	const validationSchema = settings?.preferredSchema || "zod";
	useEffect(() => {
		logger("Form elements changed, regenerating schema code:", formElements);
	}, [formElements]);
	const validationCode = generateValidationCode(
		isMS,
		formName.toLowerCase(),
		validationSchema,
		formElements,
	);
	const formattedCode = formatCode(validationCode);
	return (
		<div className="relative max-w-full">
			<Wrapper title="schema.ts" language="typescript">
				{formattedCode}
			</Wrapper>
		</div>
	);
};

export function GeneratedFormCodeViewer() {
	const settings = useSettings();
	const validationSchema = settings?.preferredSchema || "zod";
	const frameworks = ["react", "solid", "vue", "angular"] as const;
	const validationLibs = ["zod", "valibot", "arktype"] as const;
	return (
		<Tabs defaultValue="jsonSchema" className="w-full min-w-full flex">
			<div className="flex justify-between">
				<TabsList>
					<TabsTrigger value="jsonSchema">JSON Schema</TabsTrigger>
					<TabsTrigger value="schema">Schema</TabsTrigger>
				</TabsList>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<AnimatedIconButton
								icon={<ChevronDownIcon className="w-4 h-4 ml-1" />}
								text={
									settings?.preferredFramework
										? settings.preferredFramework.charAt(0).toUpperCase() +
											settings.preferredFramework.slice(1)
										: "React"
								}
								variant="ghost"
								size="sm"
								iconPosition="end"
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="z-[2000]">
							{frameworks.map((framework) => (
								<DropdownMenuItem
									key={framework}
									disabled={framework !== "react" && framework !== "solid"}
									onClick={() =>
										setPreferredFramework(
											framework as "react" | "vue" | "angular" | "solid",
										)
									}
								>
									{framework.charAt(0).toUpperCase() + framework.slice(1)}
									{framework !== "react" && framework !== "solid" && (
										<p className="text-primary">soon!</p>
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<div className="h-4 w-px bg-border" />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<AnimatedIconButton
								icon={<ChevronDownIcon className="w-4 h-4 ml-1" />}
								text={
									validationSchema.charAt(0).toUpperCase() +
									validationSchema.slice(1)
								}
								variant="ghost"
								size="sm"
								iconPosition="end"
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="z-[2000]">
							{validationLibs.map((lib) => (
								<DropdownMenuItem
									key={lib}
									onClick={() => {
										setPreferredSchema(lib as "zod" | "valibot" | "arktype");
									}}
								>
									{lib.charAt(0).toUpperCase() + lib.slice(1)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<TabsContent value="jsonSchema" tabIndex={-1}>
				<ScrollArea className="h-[60vh]">
					<CodeBlockJsonSchema />
				</ScrollArea>
			</TabsContent>
			<TabsContent value="schema" tabIndex={-1}>
				<ScrollArea className="h-[60vh]">
					<CodeBlockSchema />
				</ScrollArea>
			</TabsContent>
		</Tabs>
	);
}
