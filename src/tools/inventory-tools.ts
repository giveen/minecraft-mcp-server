import { z } from "zod";
import mineflayer from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { log } from '../logger.js';

interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export function registerInventoryTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "list-inventory",
    "List all items in the bot's inventory",
    {},
    async () => {
      const bot = getBot();
      const items = bot.inventory.items();
      log('info', `Inventory: listing items count=${items.length}`);
      const itemList: InventoryItem[] = items.map((item) => ({
        name: item.name,
        count: item.count,
        slot: item.slot
      }));

      if (items.length === 0) {
        return factory.createResponse("Inventory is empty");
      }

      let inventoryText = `Found ${items.length} items in inventory:\n\n`;
      itemList.forEach(item => {
        inventoryText += `- ${item.name} (x${item.count}) in slot ${item.slot}\n`;
      });
      log('info', 'Inventory: list returned');

      return factory.createResponse(inventoryText);
    }
  );

  factory.registerTool(
    "find-item",
    "Find a specific item in the bot's inventory",
    {
      nameOrType: z.string().describe("Name or type of item to find")
    },
    async ({ nameOrType }) => {
      const bot = getBot();
      const items = bot.inventory.items();
      log('info', `Inventory: find-item query=${nameOrType}`);
      const item = items.find((item) =>
        item.name.includes(nameOrType.toLowerCase())
      );

      if (item) {
        log('info', `Inventory: found ${item.name} x${item.count} slot=${item.slot}`);
        return factory.createResponse(`Found ${item.count} ${item.name} in inventory (slot ${item.slot})`);
      } else {
        log('warn', `Inventory: item not found query=${nameOrType}`);
        return factory.createResponse(`Couldn't find any item matching '${nameOrType}' in inventory`);
      }
    }
  );

  factory.registerTool(
    "equip-item",
    "Equip a specific item",
    {
      itemName: z.string().describe("Name of the item to equip"),
      destination: z.string().optional().describe("Where to equip the item (default: 'hand')")
    },
    async ({ itemName, destination = 'hand' }) => {
      const bot = getBot();
      const items = bot.inventory.items();
      log('info', `Inventory: equip-item name=${itemName} destination=${destination}`);
      const item = items.find((item) =>
        item.name.includes(itemName.toLowerCase())
      );

      if (!item) {
        log('warn', `Inventory: equip failed, not found name=${itemName}`);
        return factory.createResponse(`Couldn't find any item matching '${itemName}' in inventory`);
      }

      await bot.equip(item, destination as mineflayer.EquipmentDestination);
      log('info', `Inventory: equipped ${item.name} to ${destination}`);
      return factory.createResponse(`Equipped ${item.name} to ${destination}`);
    }
  );
}
