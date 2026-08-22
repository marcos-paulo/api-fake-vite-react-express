import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

type FilterInputProps = {
  value: string;
  isActive: boolean;
  onChange: (value: string) => void;
};

export const FilterInput = ({ value, isActive, onChange }: FilterInputProps) => (
  <Box borderStyle="round" borderColor={isActive ? 'cyan' : 'gray'} paddingX={1}>
    <Text color="gray">Filtro: </Text>
    {isActive ? (
      <TextInput value={value} onChange={onChange} placeholder="descrição, endereço, método, tag..." />
    ) : value ? (
      <Text>{value}</Text>
    ) : (
      <Text color="gray">(pressione f ou / para filtrar)</Text>
    )}
  </Box>
);
