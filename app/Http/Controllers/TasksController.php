<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class TasksController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('tasks/index');
    }
}
