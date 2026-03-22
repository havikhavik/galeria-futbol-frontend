import { useMemo, useState } from "react";

type ValidationErrors<TValues> = Partial<Record<keyof TValues, string>>;

type UseFormOptions<TValues> = {
  validate?: (values: TValues) => ValidationErrors<TValues>;
};

export function useForm<TValues extends Record<string, unknown>>(
  initialValues: TValues,
  options: UseFormOptions<TValues> = {},
) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof TValues, boolean>>>({});

  const errors = useMemo(
    () => (options.validate ? options.validate(values) : {}),
    [options, values],
  );

  const setFieldValue = <K extends keyof TValues>(name: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setFieldTouched = <K extends keyof TValues>(name: K, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  };

  const resetForm = (nextValues: TValues = initialValues) => {
    setValues(nextValues);
    setTouched({});
  };

  return {
    values,
    setValues,
    touched,
    errors,
    setFieldValue,
    setFieldTouched,
    resetForm,
  };
}
