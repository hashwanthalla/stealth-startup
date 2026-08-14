import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SUPPORTED_LANGUAGES, type Language } from "../shared/types";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "codeviz.db");
export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    trial_ends_at TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'trial',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS question_starter_code (
    question_id TEXT NOT NULL,
    language TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    PRIMARY KEY (question_id, language),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

function seedAdminIfNeeded() {
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@codeviz.app");
  if (admin) return;

  const id = randomUUID();
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, trial_ends_at, subscription_status, created_at)
     VALUES (?, ?, ?, 'admin', ?, 'active', ?)`
  ).run(
    id,
    "admin@codeviz.app",
    bcrypt.hashSync("admin123", 10),
    trialEnds.toISOString(),
    now.toISOString()
  );

  const questionId = randomUUID();
  db.prepare(
    `INSERT INTO questions (id, title, description, difficulty, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    questionId,
    "Bubble Sort",
    "Implement bubble sort and visualize how elements swap until the array is sorted.",
    "beginner",
    id,
    now.toISOString()
  );

  const starters: Record<Language, string> = {
    python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

data = [64, 34, 25, 12, 22, 11, 90]
result = bubble_sort(data)
print(result)`,
    javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

const data = [64, 34, 25, 12, 22, 11, 90];
const result = bubbleSort(data);
console.log(result);`,
    java: `import java.util.Arrays;

public class Main {
    static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }

    public static void main(String[] args) {
        int[] data = {64, 34, 25, 12, 22, 11, 90};
        bubbleSort(data);
        System.out.println(Arrays.toString(data));
    }
}`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    vector<int> data = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(data);
    for (int v : data) cout << v << " ";
    return 0;
}`,
    c: `#include <stdio.h>

void bubble_sort(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int data[] = {64, 34, 25, 12, 22, 11, 90};
    int n = 10;
    bubble_sort(data, n);
    for (int i = 0; i < n; i++) printf("%d ", data[i]);
    return 0;
}`,
    csharp: `using System;

class Program {
    static void BubbleSort(int[] arr) {
        int n = arr.Length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }

    static void Main() {
        int[] data = {64, 34, 25, 12, 22, 11, 90};
        BubbleSort(data);
        Console.WriteLine(string.Join(", ", data));
    }
}`,
    go: `package main

import "fmt"

func bubbleSort(arr []int) {
    n := len(arr)
    for i := 0; i < n; i++ {
        for j := 0; j < n-i-1; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }
}

func main() {
    data := []int{64, 34, 25, 12, 22, 11, 90}
    bubbleSort(data)
    fmt.Println(data)
}`,
  };

  const insertStarter = db.prepare(
    `INSERT INTO question_starter_code (question_id, language, starter_code) VALUES (?, ?, ?)`
  );
  for (const lang of SUPPORTED_LANGUAGES) {
    insertStarter.run(questionId, lang, starters[lang]);
  }
}

seedAdminIfNeeded();
