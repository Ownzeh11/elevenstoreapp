import React from 'react';
// Import `TableColumn` from `../types`
import { TableColumn } from '../../types';

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
  rowKey: keyof T | ((item: T) => string | number);
}

const Table = <T extends Record<string, any>>({ data, columns, className = '', rowKey }: TableProps<T>) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((item, index) => {
            const key = typeof rowKey === 'function' ? rowKey(item) : String(item[rowKey]);
            return (
              <tr key={key}>
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`whitespace-nowrap px-6 py-4 text-sm text-gray-800 ${column.cellClassName || ''}`}
                  >
                    {column.render ? column.render(item) : (item[column.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;